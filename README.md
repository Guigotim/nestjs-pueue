<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A 
Queue manager for NestJS applications using TypeORM and PostgreSQL.</p>

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
import { Injectable } from '@nestjs/common'
import { Pueue } from 'nestjs-pueue'
export class EmailService {
    constructor(private readonly pueue: Pueue) {}

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
import { Processor, Process } from 'nestjs-pueue'

@Processor()
@Injectable()
export class EmailProcessor {
    @Process('send-email')
    async sendEmail(job: Job) {
        // send email
    }
}
```
