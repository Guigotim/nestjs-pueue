import { QueryRunner } from 'typeorm'
import { Migration } from '../interfaces/migration.interface'

export class MigrationConfig implements Migration {
    name = 'MigrationConfig'
    version = 0

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA "pueue"`)
        await queryRunner.query(`
            CREATE TABLE "pueue"."migration" (
                "id" SERIAL NOT NULL,
                "version" integer NOT NULL,
                "name" character varying NOT NULL)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pueue"."migration"`)
        await queryRunner.query(`DROP SCHEMA "pueue"`)
    }
}
