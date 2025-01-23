import { Reflector } from '@nestjs/core'
import { Injectable, Type } from '@nestjs/common'
import { QueueHookOptions } from './decorators/queue-hooks.decorators'
import {
    PUEUE_MODULE_ON_QUEUE_EVENT,
    PUEUE_MODULE_QUEUE_PROCESS,
    PUEUE_MODULE_QUEUE_PROCESSOR,
} from './pueue-constants'
import { PueueProcessOptions } from './interfaces/pueue-process-options.interface'

@Injectable()
export class PueueMetadataAcessor {
    constructor(private readonly reflactor: Reflector) {}

    isProcessor(target: Type<any> | (() => void)): boolean {
        if (!target) {
            return false
        }
        return !!this.reflactor.get(PUEUE_MODULE_QUEUE_PROCESSOR, target)
    }

    isProcess(target: Type<any> | (() => void)): boolean {
        if (!target) {
            return false
        }
        return !!this.reflactor.get(PUEUE_MODULE_QUEUE_PROCESS, target)
    }

    isQueue(target: Type<any> | (() => void)): boolean {
        if (!target) {
            return false
        }
        return !!this.reflactor.get(PUEUE_MODULE_ON_QUEUE_EVENT, target)
    }

    getProcessMetadata(target: Type<any> | (() => void)): PueueProcessOptions | undefined {
        return this.reflactor.get(PUEUE_MODULE_QUEUE_PROCESS, target)
    }

    getQueueMetadata(target: Type<any> | (() => void)): QueueHookOptions | undefined {
        return this.reflactor.get(PUEUE_MODULE_ON_QUEUE_EVENT, target)
    }
}
