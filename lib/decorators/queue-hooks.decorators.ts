import { SetMetadata } from '@nestjs/common'
import { PueueEvents } from '../enums/pueue-queue-events.enum'
import { PUEUE_MODULE_ON_QUEUE_EVENT } from 'lib/pueue-constants'

export interface QueueHookOptions {
    eventName: PueueEvents
    process: string
}

export const OnQueueEvent = (options: QueueHookOptions) => SetMetadata(PUEUE_MODULE_ON_QUEUE_EVENT, options)

export const OnQueueError = (process: string) => OnQueueEvent({ eventName: PueueEvents.ERROR, process })
export const OnQueueCompleted = (process: string) => OnQueueEvent({ eventName: PueueEvents.COMPLETED, process })
export const OnQueueFailed = (process: string) => OnQueueEvent({ eventName: PueueEvents.FAILED, process })
export const OnQueueInterrupted = (process: string) => OnQueueEvent({ eventName: PueueEvents.INTERRUPTED, process })
