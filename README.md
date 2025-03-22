<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A queue manager for NestJS applications using TypeORM and PostgreSQL.</p>

## Description

This library uses PostgreSQL’s `SKIP LOCKED` feature to handle concurrent jobs without blocking. Each worker process obtains pending jobs with an optimistic row lock using `FOR UPDATE SKIP LOCKED`, so multiple workers can process jobs simultaneously. Once a job is taken, its status is updated within a transaction, ensuring data integrity and preventing conflicts. By configuring concurrency and batch size, you can scale queue processing effectively and avoid transactional deadlocks.

## Installation

```bash
npm install nestjs-pueue
```

## Configuration

Import the PueueModule in your main module:

```typescript
import { Module } from '@nestjs/common'
import { PueueModule } from 'nestjs-pueue'

@Module({
    imports: [
        PueueModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'pueue',
            // ...other TypeORM options...
        }),
    ],
})
export class AppModule {}
```

## Usage

- Add jobs to the queue:

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { Pueue } from 'nestjs-pueue'

export class EmailService {
    constructor(
        @Inject()
        private readonly pueue: Pueue,
    ) {}

    async enqueueEmail() {
        await this.pueue.add('send-email', {
            data: { recipient: '...' },
        })
    }
}
```

- Create processes with the @Process decorator:

```typescript
import { Injectable } from '@nestjs/common'
import { Processor, Process, PueueJob } from 'nestjs-pueue'

@Processor()
@Injectable()
export class EmailProcessor {
    @Process('send-email')
    async sendEmail(job: PueueJob) {
        // send email
    }
}
```

## ⚠️ Error Handling & Automatic Retries

**Important:** To guarantee that failed jobs are automatically reprocessed, throw an error in your process method. This will mark the job as failed and queue it for retry!

```typescript
@Processor()
@Injectable()
export class EmailProcessor {
    @Process('send-email')
    async sendEmail(job: PueueJob) {
        try {
            // Attempt to send email
            await this.emailService.send(job.data)
        } catch (error) {
            // Throwing the error triggers automatic reprocessing
            throw new Error(`Failed to send email: ${error.message}`)
        }
    }
}
```

This automatic retry mechanism ensures your jobs can recover from transient failures without manual intervention!

- Interrupt the process:

you can interrupt the process by calling the `interrupt` method on the job instance. This will mark the job as INTERRUPTED and it will not be reprocessed by the queue manager. You can also pass a reason for the interruption.

```typescript
@Processor()
@Injectable()
export class EmailProcessor {
    @Process('send-email')
    async sendEmail(job: PueueJob<{ recipient: string }>) {
        // send email
        if (job.data.recipient !== 'valid') {
            // interrupt the job
            // this will mark the job as INTERRUPTED and it will not be reprocessed
            // by the queue manager
            return job.interrupt('Recipient is not valid')
        }
    }
}
```

## Process options

You can pass options to the process method. The options are:
| Option | Description | Default |
|--------|-------------|---------|
| `name` | The process name, used to identify it in the queue manager. | - |
| `delay` | The delay (in milliseconds) before fetching the next job from the database. Useful to prevent a burst of queries. | 2000 |
| `concurrency` | The number of jobs to process concurrently. | 1 |
| `batchSize` | The number of jobs to process in a batch. | 1 or concurrency |

`batchSize` determines how many jobs are processed in a single cycle. If it is smaller than `concurrency`, it will be adjusted to match the `concurrency` value, ensuring that all available promises remain active.

```typescript
@Processor()
@Injectable()
export class EmailProcessor {
    @Process({
        name: 'send-email',
        delay: 10000,
        concurrency: 5,
        batchSize: 20,
    })
    async sendEmail(job: PueueJob) {
        // send email
    }
}
```

## Add job options

You can pass options to the add method. The options are:
| Option | Description | Default |
|--------|-------------|---------|
| `*name` | The job name, used to identify it in the queue manager. | - |
| `*data` | The job data, used to pass data to the process method. | - |
| `id` | The job id, used to identify the job in the queue manager. | `uuid` |
| `maxAttempts` | The maximum number of attempts to process the job. | 3 |
| `delay` | The delay (in milliseconds) before processing the job. | 0 |
| `backoff` | The backoff (in milliseconds or [`BackoffOptions`](#backoffoptions)) before retrying the job. | 0 |

<i> \* Required fields</i>

The `id` is optional since it serves as a unique key in the table. If a duplicate `id` is provided, the existing job will be overwritten. This can be useful for updating old jobs and preventing outdated duplicates from being processed.

### backoffOptions:

| Option  | Description                                           |
| ------- | ----------------------------------------------------- |
| `type`  | The backoff type, `fixed`, `exponential` or `linear`. |
| `delay` | The delay (in milliseconds) before retrying the job.  |

```typescript
await this.pueue.add('send-email', {
    data: { recipient: '...' },
    maxAttempts: 5,
    delay: 1000,
    backoff: {
        type: 'fixed',
        delay: 30000,
    },
    // id will be generated automatically
})
```

## Events

You can listen to events emitted by the queue manager using the decorators below. These events are emitted when a job is completed, failed, error or interrupted.
| Decorator | Description |
|-----------|-------------|
| `@onQueueCompleted` | Emitted when a job is completed. |
| `@onQueueFailed` | Emitted when a job fails after all attempts. |
| `@onQueueError` | Emitted when a job fails but not after all attempts. |
| `@onQueueInterrupted` | Emitted when a job is interrupted. |

```typescript
@Processor()
@Injectable()
export class EmailProcessor {
    @Process('send-email')
    async sendEmail(job: PueueJob) {
        // send email
    }

    @OnQueueCompleted('send-email')
    async sendMailCompleted(job: PueueJob) {
        console.log(`Job ${job.id} completed`)
    }

    @OnQueueFailed('send-email')
    async sendMailFailed(job: PueueJob) {
        console.log(`Job ${job.id} failed`)
    }

    @OnQueueError('send-email')
    async sendMailError(job: PueueJob) {
        console.log(`Job ${job.id} error`)
    }

    @OnQueueInterrupted('send-email')
    async sendMailInterrupted(job: PueueJob) {
        console.log(`Job ${job.id} interrupted`)
    }
```

## Migrations

The library automatically creates the necessary tables and columns in the database based on the provided TypeORM options. You only need to ensure that the user has the required permissions to create `extensions`, `tables`, and `schemas` in the database.

When a new version introduces changes to the database structure, it will be released as a major version, so you don’t have to worry about breaking changes. The library will automatically generate the necessary migrations to update the database structure when you upgrade it.
