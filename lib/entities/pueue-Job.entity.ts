import { BackoffOptions } from 'lib/interfaces/pueue-options.interface'
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity('job', { schema: 'pueue' })
export class PueueJob<T = any> {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @PrimaryColumn()
    process: string

    @Column({ type: 'jsonb' })
    data: T

    @Column({ default: 'pending' })
    status: 'pending' | 'completed' | 'failed' | 'interrupted'

    @Column({ type: 'jsonb', nullable: true })
    log: string

    @Column({ default: 0 })
    attempt: number

    @Column({ name: 'max_attempts', default: 3 })
    maxAttempts: number

    @Column({ default: 0 })
    delay: number

    @Column({ type: 'jsonb', nullable: true })
    backoff: BackoffOptions

    @Column({ name: 'run_after', type: 'timestamp' })
    runAfter: Date

    @Column({ name: 'created_at', type: 'timestamp' })
    createdAt: Date

    @Column({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date

    interrupt(cause?: string) {
        this.status = 'interrupted'
        this.log = cause
    }
}
