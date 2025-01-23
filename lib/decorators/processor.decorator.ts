import { SetMetadata } from '@nestjs/common'
import { PUEUE_MODULE_QUEUE_PROCESSOR } from 'lib/pueue-constants'

export const Processor = () => SetMetadata(PUEUE_MODULE_QUEUE_PROCESSOR, true)
