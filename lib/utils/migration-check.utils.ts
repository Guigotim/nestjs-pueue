import { QueryRunner } from 'typeorm'

export class MigrationCheck {
    public static async checkMigrations(queryRunner: QueryRunner): Promise<number> {
        if (!(await queryRunner.hasTable('pueue.migration'))) return -1
        const migrations: { id: number; version: number; name: string }[] = await queryRunner.query(
            `SELECT * FROM "pueue"."migration"`,
        )
        if (migrations.length === 0) {
            return 0
        }
        return migrations.reduce((acc, migration) => {
            if (migration.version > acc) {
                return migration.version
            }
            return acc
        }, 0)
    }
}
