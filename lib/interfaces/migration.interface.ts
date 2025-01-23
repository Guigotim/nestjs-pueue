import { QueryRunner } from 'typeorm'

export interface Migration {
    name: string
    version: number
    up(queryRunner: QueryRunner): Promise<void>
    down(queryRunner: QueryRunner): Promise<void>
}
