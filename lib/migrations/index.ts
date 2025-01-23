import { FirstMigration } from './first-migration'
import { MigrationConfig } from './migration-config'

export const migrations = [new MigrationConfig(), new FirstMigration()]
