import { DynamicModule, Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { PueueJob } from './entities/pueue-Job.entity'
import { PueueJobService } from './services/pueue-job.service'
import { PueueWorker } from './pueue.worker'
import { DiscoveryModule } from '@nestjs/core'
import { PueueMetadataAcessor } from './pueue-metadata.accessor'
import { Pueue } from './Pueue'
import { PueueMigrationManager } from './pueue-migration.manager'

@Module({})
export class PueueModule {
    static forRoot(options: TypeOrmModuleOptions): DynamicModule {
        return {
            module: PueueModule,
            imports: [
                DiscoveryModule,
                TypeOrmModule.forRoot({
                    ...options,
                    entities: [PueueJob],
                })
            ],
            providers: [PueueWorker, PueueMigrationManager, PueueJobService, PueueMetadataAcessor, Pueue],
            exports: [Pueue],
        }
    }
}
