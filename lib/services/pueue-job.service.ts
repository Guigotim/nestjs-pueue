import { Injectable, Logger } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { PueueJob } from '../entities/pueue-Job.entity'
import { BackoffOptions, PueueOptions } from '../interfaces/pueue-options.interface'
import EventEmitter from 'node:stream'
import { PueueEvents } from 'lib/enums/pueue-queue-events.enum'
import { QueueHookOptions } from 'lib/decorators/queue-hooks.decorators'

@Injectable()
export class PueueJobService {
    private eventEmitter = new EventEmitter()
    private readonly logger = new Logger(PueueJobService.name)
    constructor(
        private dataSource: DataSource,
    ) {}

    async process(process: string, handler: (job: PueueJob) => Promise<void>, concurrency = 1, batchSize = 1) {
        const queryRunner = this.dataSource.createQueryRunner()
        const { manager } = queryRunner

        await queryRunner.connect()
        await queryRunner.startTransaction()

        if(batchSize < concurrency) {
            batchSize = concurrency
        }

        try {
            const jobs = await this.findPendingJobsByProcess(process, batchSize, manager)
            if (!jobs || jobs.length === 0) {
                return
            }
            let promises: Promise<void>[] = []
            let index = 0
            for await (const job of jobs) {
                promises.push(
                    (async () => {
                        try {
                            await handler(job)
                            if (job.status === 'interrupted') {
                                await this.markJobAsInterrupted(job, manager)
                            } else {
                                await this.markJobAsCompleted(job, manager)
                            }
                        } catch (error) {
                            if (job.attempt === job.maxAttempts) {
                                await this.markJobAsFailed(job, error.message, manager)
                                this.logger.error(`Error on processing ${process} job ${job.id}`, error.stack, error.message)
                            } else {
                                this.logger.warn(`Attempt ${job.attempt} on processing ${process} failed for job ${job.id}: ${JSON.stringify(error.message)}`)
                                await this.updateJobAttempts(job, error.message, manager)
                            }
                        }
                    })(),
                )
                index++
                if (index >= concurrency) {
                    await Promise.all(promises)
                    promises = []
                    index = 0
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises)
            }
        } catch (error) {
            this.logger.error(`Error on processing ${process}`, error.stack, error.message)
        } finally {
            await queryRunner.commitTransaction()
            await queryRunner.release()
        }
    }

    async create(process: string, jobOptions: PueueOptions) {
        return await this.dataSource.transaction(async (em) => {
            const job = em.create(PueueJob, {
                ...jobOptions,
                process: process,   
                status: 'pending',
                attempt: 1,
                backoff:
                typeof jobOptions.backoff == 'number'
                    ? { delay: jobOptions.backoff, type: 'fixed' }
                    : jobOptions.backoff || { delay: 0, type: 'fixed' },
                runAfter: new Date(Date.now() + (jobOptions.delay || 0)),
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            await em.save(job)
        })
    }

    on(options: QueueHookOptions, handler: (job: PueueJob) => void) {
        this.eventEmitter.on(`${options.process}:${options.eventName}`, (job: PueueJob) => handler(job))
    }

    private async findPendingJobsByProcess(process: string, batchSize: number, em: EntityManager): Promise<PueueJob[] | null> {
        const queryBuilder = em.createQueryBuilder(PueueJob, 'job')
        return await queryBuilder
            .where("job.status = 'pending'")
            .andWhere('job.process = :process', { process })
            .andWhere('job.runAfter <= :now', { now: new Date() })
            .andWhere('job.attempt <= job.maxAttempts')
            .orderBy('job.runAfter', 'ASC')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .limit(batchSize)
            .getMany()
    }

    private async markJobAsCompleted(job: PueueJob, em: EntityManager) {
        await em.update(PueueJob, {id: job.id, process: job.process}, {
            status: 'completed',
            updatedAt: new Date(),
        })
        this.emitSafe(PueueEvents.COMPLETED, job)
    }

    private async markJobAsInterrupted(job: PueueJob, em: EntityManager) {
        await em.update(PueueJob, {id: job.id, process: job.process}, {
            status: 'interrupted',
            log: job.log,
            updatedAt: new Date(),
        })
        this.emitSafe(PueueEvents.INTERRUPTED, job)
    }

    private async markJobAsFailed(job: PueueJob, errorMessage: string, em: EntityManager) {
        await em.update(PueueJob, {id: job.id, process: job.process}, {
            status: 'failed',
            attempt: job.attempt,
            log: errorMessage,
            updatedAt: new Date(),
        })
        this.emitSafe(PueueEvents.FAILED, job)
    }

    private async updateJobAttempts(job: PueueJob, errorMessage: string, em: EntityManager) {
        await em.update(PueueJob, {id: job.id, process: job.process}, {
            attempt: job.attempt + 1,
            runAfter: new Date(Date.now() + this.calculateBackoffDelay(job.backoff, job.attempt)),
            log: errorMessage,
            updatedAt: new Date(),
        })
        this.emitSafe(PueueEvents.ERROR, job)
    }

    private emitSafe(eventName: string, job: PueueJob) {
        try {
            this.eventEmitter.emit(`${job.process}:${eventName}`, job)
        } catch (error) {
            try {
                this.eventEmitter.emit(`${job.process}:${PueueEvents.ERROR}`, job)
            } catch (error) {
                console.error(`Error on emitting event ${eventName}: ${error.message}`)
            }
        }
    }

    private calculateBackoffDelay(BackoffOptions: BackoffOptions, attempts: number): number {
        if (BackoffOptions.type === 'linear') {
            return BackoffOptions.delay * attempts
        } else if (BackoffOptions.type === 'exponential') {
            return Math.pow(BackoffOptions.delay, attempts)
        }
        return BackoffOptions.delay
    }
}
