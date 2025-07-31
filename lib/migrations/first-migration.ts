import { QueryRunner } from 'typeorm'
import { Migration } from '../interfaces/migration.interface'

export class FirstMigration implements Migration {
    name = 'FirstMigration'
    version = 1

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
        await queryRunner.query(
            `CREATE TABLE "pueue"."job" (
                "id" character varying NOT NULL DEFAULT uuid_generate_v4(), 
                "process" character varying NOT NULL, 
                "data" jsonb NOT NULL, 
                "status" character varying NOT NULL DEFAULT 'pending', 
                "log" jsonb, 
                "attempt" integer NOT NULL DEFAULT '0', 
                "max_attempts" integer NOT NULL DEFAULT '3', 
                "delay" integer NOT NULL DEFAULT '0',
                "backoff" jsonb NOT NULL,
                "run_after" TIMESTAMP NOT NULL DEFAULT now(), 
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_98ab1c14ff8d1cf80d18703b92f" PRIMARY KEY ("id", "process"))`,
        )
        await queryRunner.query(
            `CREATE INDEX idx_job_query_status_process ON pueue.job 
                (status, process, run_after)`,
        )
        await queryRunner.query(`
            INSERT INTO "pueue"."migration" (version, name) VALUES (${this.version}, '${this.name}')
            `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pueue"."job"`)
        await queryRunner.query(`DROP INDEX idx_job_query_status_process`)
        await queryRunner.query(`DELETE FROM "pueue"."migration" WHERE "version" = ${this.version}`)
    }
}
