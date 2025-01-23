export interface PueueOptions {
    id?: string
    data: Record<string, any>
    maxAttempts?: number
    delay?: number
    backoff?: number | BackoffOptions
}

export interface BackoffOptions {
    delay: number
    type: 'fixed' | 'exponential' | 'linear'
}
