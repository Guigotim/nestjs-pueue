import { SetMetadata } from '@nestjs/common'
import { isString } from '@nestjs/common/utils/shared.utils'
import { PueueProcessOptions } from '../interfaces/pueue-process-options.interface'
import { PUEUE_MODULE_QUEUE_PROCESS } from 'lib/pueue-constants'

export function Process(name: string): MethodDecorator
export function Process(options: PueueProcessOptions): MethodDecorator
export function Process(nameOrOptions: string | PueueProcessOptions): MethodDecorator {
    const options = isString(nameOrOptions) ? { name: nameOrOptions } : nameOrOptions
    return SetMetadata(PUEUE_MODULE_QUEUE_PROCESS, options || {})
}
