import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { DiscoveryService, MetadataScanner } from '@nestjs/core'
import { PueueJobService } from './services/pueue-job.service'
import { PueueMetadataAcessor } from './pueue-metadata.accessor'
import { PueueMigrationManager } from './pueue-migration.manager'
import { PueueProcessOptions } from './interfaces/pueue-process-options.interface'

@Injectable()
export class PueueWorker implements OnApplicationBootstrap {
    private readonly logger = new Logger(PueueWorker.name)

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
        private readonly metadataAcessor: PueueMetadataAcessor,
        private readonly jobService: PueueJobService,
        private readonly migrationManager: PueueMigrationManager,
    ) {}

    async onApplicationBootstrap() {
        try {
            await this.migrationManager.migration()
        } catch (error) {
            this.logger.fatal(`Error on migration: ${error.message}`)
            throw error
        }
        this.logger.log('Startin Pueue Worker...')
        try {
            this.discoveryService
                .getProviders()
                .filter((provider) =>
                    this.metadataAcessor.isProcessor(
                        !provider.metatype || provider.inject ? provider.instance?.constructor : provider.metatype,
                    ),
                )
                .forEach(({ instance }) => {
                    this.metadataScanner
                        .getAllMethodNames(instance)
                        .filter(
                            (methodName) =>
                                this.metadataAcessor.isProcess(instance[methodName]) ||
                                this.metadataAcessor.isQueue(instance[methodName]),
                        )
                        .forEach((methodName) => {
                            const process = this.metadataAcessor.getProcessMetadata(instance[methodName])
                            if (process) this.startWorker(instance, methodName, process)
                            const queue = this.metadataAcessor.getQueueMetadata(instance[methodName])
                            if (queue) this.jobService.on(queue, instance[methodName].bind(instance))
                        })
                })
        } catch (error) {
            this.logger.fatal(`Error on starting worker: ${error.message}`)
            throw error
        }
    }

    private async startWorker(instance: object, method: string, process: PueueProcessOptions) {
        this.logger.debug(`Parameteres: ${instance.constructor.name}:${method} - ${JSON.stringify(process)}`)
        this.logger.log(`Starting process job ${process.name}...`)
        while (true) {
            this.logger.debug(`Processing process job ${process.name} on ${instance.constructor.name}:${method}`)
            try {
                await this.jobService.process(
                    process.name,
                    instance[method].bind(instance),
                    process.concurrency,
                    process.batchSize,
                )
            } catch (error) {
                this.logger.error(`Error on processing ${process.name}`, error.stack, JSON.stringify(error.message))
            } finally {
                await this.delay(process.delay || 2000)
            }
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
