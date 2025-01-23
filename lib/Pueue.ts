import { Injectable } from '@nestjs/common'
import { PueueJobService } from './services/pueue-job.service'
import { PueueOptions } from './interfaces/pueue-options.interface'

@Injectable()
export class Pueue {
    constructor(private readonly pueueService: PueueJobService) {}

    async add(process: string, jobOptions?: PueueOptions): Promise<void> {
        await this.pueueService.create(process, jobOptions)
    }
}
