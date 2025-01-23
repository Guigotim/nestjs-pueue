import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { migrations } from './migrations'
import { MigrationCheck } from './utils/migration-check.utils'

@Injectable()
export class PueueMigrationManager {
    constructor(private readonly dataSource: DataSource) {}

    async migration() {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        try {
            const lastMigrationVersion = await MigrationCheck.checkMigrations(queryRunner)
            const migrationOrdened = migrations.sort((a, b) => a.version - b.version)
            for (const migration of migrationOrdened) {
                if (migration.version <= lastMigrationVersion) {
                    continue
                }
                await migration.up(queryRunner)
            }
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }
}
