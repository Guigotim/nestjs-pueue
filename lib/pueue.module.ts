import { DynamicModule, Global, Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { PueueJob } from './entities/pueue-Job.entity'
import { PueueJobService } from './services/pueue-job.service'
import { PueueWorker } from './pueue.worker'
import { DiscoveryModule } from '@nestjs/core'
import { PueueMetadataAcessor } from './pueue-metadata.accessor'
import { Pueue } from './Pueue'
import { PueueMigrationManager } from './pueue-migration.manager'

@Global()
@Module({})
export class PueueModule {

    /**
     * Registers the PueueModule using `default` data source.
     * 
     * Note: It's only works if you have already initialized TypeORM globally in your application.
     * 
     * @returns A DynamicModule configured with the specified options or data source name.
     */
    static forRoot(): DynamicModule
    /**
     * Registers the PueueModule with the specified TypeORM options.
     *
     * Use this overload of `forRoot()` when you want the PueueModule to create and manage its own TypeORM data source,
     * by providing a `TypeOrmModuleOptions` object. This is useful if you have not initialized TypeORM elsewhere,
     * or if you require a dedicated connection for Pueue jobs.
     *
     * Note: If you have already initialized TypeORM globally in your application, avoid using this overload with the same
     * data source configuration, as it may result in multiple connections or conflicts. In such cases, prefer using
     * `forRoot()` with a data source name or no arguments to reuse an existing connection.
     *
     * @param options - TypeORM configuration options for creating a new data source specifically for the PueueModule.
     * @returns A DynamicModule configured with the provided TypeORM options.
     */
    static forRoot(options?: TypeOrmModuleOptions): DynamicModule

    /**
     * Registers the PueueModule with the specified data source name.
     * 
     * Note: It's only works if you have already initialized TypeORM globally in your application.
     * 
     * @param dataSourceName - The name of the data source to use for the PueueModule.
     * @returns A DynamicModule configured with the specified data source name.
     */
    static forRoot(dataSourceName?: string): DynamicModule
    static forRoot(dataSourceNameOrOptions?: TypeOrmModuleOptions | string): DynamicModule {
        const imports = []
        imports.push(DiscoveryModule)
        if (typeof dataSourceNameOrOptions === 'string') {
            imports.push(TypeOrmModule.forFeature([PueueJob], dataSourceNameOrOptions))
        } else if (dataSourceNameOrOptions) {
            imports.push(TypeOrmModule.forRoot({ ...dataSourceNameOrOptions, entities: [PueueJob] }))
        } else {
            imports.push(TypeOrmModule.forFeature([PueueJob]))
        }

        return {
            module: PueueModule,
            imports: imports,
            providers: [PueueWorker, PueueMigrationManager, PueueJobService, PueueMetadataAcessor, Pueue],
            exports: [Pueue],
        }
    }
}
