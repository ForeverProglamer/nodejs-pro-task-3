# E-commerce Platform

## Quick start

Requirements:
- Node.js (v24.13.0)
- npm
- Docker & Docker Compose

```bash
cp .env.example .env
docker compose up -d
npm i
npm run db:migrate
npm run db:seed
npm run start:dev
```

Accessing services:
- API: http://localhost:3000
- Postgres: http://localhost:5432
- RabbitMQ: http://localhost:5672
- RabbitMQ Web UI: http://localhost:15672

> NOTE: See `.env.example` / `.env` for service credentials.

## Bruno API Collection

`./api-collection` contains a couple of endpoints for API testing 
that you can import.

## RabbitMQ (Task 7)

At this point, RabbitMQ is used to implement a work queue to execute long-running 
tasks in the background. This way, we unload the `POST /orders` endpoint that
creates new orders to keep this user interaction path quick and responsive.

The work queue itself is presented as:
* 2 queues: `orders.process` and `orders.dlq`
* `orders.process` - main queue for processing and retrying tasks
* `orders.dlq` - secondary queue for storing failed tasks for further 
  examining and manually processing
* Both queues are created as `durable: true` and messages sent to them are marked
  as `persistent: true`
* Exchanges: default ("")
* Routing: default exchange -> queues by name
* Current setup implements the "republish + ack" retry policy
* Worker and retrying is configured by `WORKER_*` env vars provided in `.env.example`
* For simplicity, current setup runs both producer (API, specifically `OrdersService.createOrder`)
  and consumer (`OrdersWorkerService`) within one processs. This approach is acceptable, provided
  our workload is IO-bound tasks, therefore we do not block process' event loop
* Message delivery is implemented as "at-least-once", considering a possibility of duplicate
  delivery, worker was designed to be idempotent and perform a business effect only once
* Idempotency is achieved by storing processed messages in `processed_messages` table and 
  enforcing unique constraint on `[messageId, handler]`. Once a message 
  was processed by a worker, we save its `messageId` and `handler` that processed it to that table.
  On a subsequent processing of the same message by the same handler, unique constraint violation
  error occurs which prevents worker from processing the same message twice.

Configuring worker:
* `WORKER_ENABLE` boolean - enable/disable worker for application run
* `WORKER_RETRIES` number - how many times worker should retry a failing task,
  before sending it to DLQ
* `WORKER_BACKOFF_S` number - backoff in seconds between task retries

## How to reproduce (Task 7)

### Happy Path
1. `GET /orders` (`userId` query param required) — take `productId`.
2. `POST /orders` — you will get order with status `created`.
3. After a couple of seconds `GET /orders/:id` — status should change to `processed`.

### Retry + DLQ
There is debug endpoint (dev/test only):
- `POST /debug/orders/process`

Payload example for simulating a failure:
```json
{
  "messageId": "<existing-order-id>",
  "orderId": "<existing-order-id>",
  "attempt": 1,
  "createdAt": "<some-date>",
  "simulateFailure": {
    "reason": "this is a test failure",
    "stopOnAttempt": 2
  }
}
```

Expected behavior for `stopOnAttempt` > `WORKER_RETRIES`:
- worker exhausts all retries and sends a message  to `orders.dlq`
- as a result we have +1 message in DLQ which can be verified 
  in RabbitMQ UI (Queues -> `orders.dlq`) and also in NestJS application logs

Expected behavior for `stopOnAttempt` <= `WORKER_RETRIES`:
- worker exhausts retries until `stopOnAttempt`, then execution
  succeeds and message gets removed from `orders.process` queue
- republishing can be verified in RabbitMQ UI (Queues -> `orders.process`)
  and also in NestJS application logs

### Idempotency
1. Repeat actions of the `Happy Path` step, make sure order status
  is `processed`, remember `processedAt` value
2. Then, repeat `POST /orders` for the same order with the same `Idempotency-Key` header 
3. Wait for a couple of seconds, then `GET /orders/:id` to see that 
  `processedAt` has not change (business side-effect was not repeated),
  also examine application logs to see that duplicate delivery was detected,
  thus dedup fired
