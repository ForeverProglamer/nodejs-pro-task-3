# E-commerce Platform

NestJS backend API for an e-commerce order-processing flow. The project is built as a course work for Node.js PRO and demonstrates a complete business scenario: authenticated order creation, input validation, stock reservation in PostgreSQL, asynchronous processing through RabbitMQ, status polling, logs, tests, Dockerized local runtime, and public deployment.

## Deployed Environments

- Production: https://c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api
- Stage: https://stage.c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api
- Swagger UI:
  - https://c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api/docs
  - https://stage.c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api/docs
- Health checks:
  - https://c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api/health
  - https://stage.c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org/api/health

The public VM uses Caddy as a reverse proxy in front of two Docker Compose deployments:

```caddyfile
c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3001
}

stage.c94f026a9d5e40278b2265f2fc8d3d56.dpdns.org {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

## Main Business Flow

The main end-to-end scenario is order creation and background processing:

1. User signs up or logs in through `POST /api/auth/sign-up` or `POST /api/auth/login`.
2. User sends `POST /api/orders` with a bearer token, validated JSON body, and `Idempotency-Key` header.
3. The API checks authentication, validates product IDs and quantities, verifies stock, and creates the order in a PostgreSQL transaction.
4. Product stock is decreased atomically, and duplicate submissions are protected by a unique `(user_id, idempotency_key)` constraint.
5. The API publishes an `orders.process` message to RabbitMQ.
6. The worker consumes the message, deduplicates processing through the `processed_messages` table, and changes order status from `created` to `processed`.
7. User polls `GET /api/orders/:id` or `GET /api/orders?status=processed` to verify the final state.
8. The flow is visible in HTTP logs, order service logs, worker logs, and RabbitMQ queues.

This is not a plain CRUD flow: it includes stock mutation, transactional consistency, idempotency, asynchronous processing, retries, and observable status changes.

## Architecture

- `src/auth`: sign-up, login, JWT access tokens, refresh-token cookie flow, global JWT guard.
- `src/users`: current-user profile endpoint and user persistence.
- `src/products`: product read model used by the order flow.
- `src/orders`: order API, transactional order creation, stock reservation, idempotency, order listing, and background worker.
- `src/rabbit-mq`: RabbitMQ connection, queue declaration, producer, and consumer helpers.
- `src/common`: error handling, unit of work, request logging, correlation IDs, and shared entities.
- `src/migrations`: TypeORM migrations for schema evolution.
- `src/seed`: demo users and products.
- `test`: end-to-end tests for the main scenario.

Runtime components:

- NestJS API
- PostgreSQL for persistent storage
- RabbitMQ for background processing
- Caddy for public reverse proxying
- Docker Compose for local, stage, and production runtime

## Local Quick Start

Requirements:

- Node.js 24.13.0
- npm
- Docker and Docker Compose

```bash
cp .env.example .env
npm ci
npm run compose:up
npm run compose:ps
```

Local services:

- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/health
- PostgreSQL: localhost:5432
- RabbitMQ AMQP: localhost:5672
- RabbitMQ Management UI: http://localhost:15672

Stop local services:

```bash
npm run compose:down
```

One-off jobs:

```bash
docker compose run --rm migrate
docker compose --profile seed run --rm seed
```

The default seed creates:

- Admin: `admin@example.com` / `admin-pass`
- User: `user@example.com` / `user-pass`
- Products: Laptop, Mouse, Keyboard

## API Usage

Swagger is available at `/api/docs`. A Bruno collection is also available in `api-collection/`.

Typical manual flow:

```bash
BASE_URL=http://localhost:3000/api

TOKEN=$(curl -s "$BASE_URL/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"user@example.com","password":"user-pass"}' \
  | jq -r .accessToken)

curl "$BASE_URL/orders" \
  -H "authorization: Bearer $TOKEN"
```

To create a new order, take a product ID from Swagger, Bruno, existing seeded data, or `GET /api/orders`, then call:

```bash
curl -X POST "$BASE_URL/orders" \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "items": [
      { "id": "<product-id>", "qty": 1 }
    ]
  }'
```

Expected result:

- Initial response has status `created`.
- After a short delay, `GET /api/orders/<order-id>` returns status `processed`.
- Product stock is decreased.
- Reusing the same `Idempotency-Key` returns the same order and does not decrease stock twice.

## Configuration

Configuration is loaded from environment variables. Start from `.env.example`.

Important variables:

- `API_PORT`: host port used by Docker Compose.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL connection.
- `JWT_AT_SECRET`, `JWT_RT_SECRET`: JWT signing secrets.
- `RABBITMQ_URL`, `RABBITMQ_USER`, `RABBITMQ_PASS`: RabbitMQ connection.
- `WORKER_ENABLE`: enables the order-processing consumer.
- `WORKER_RETRIES`, `WORKER_BACKOFF_S`: retry behavior before messages are sent to DLQ.

Secrets are injected through GitHub Environments for stage and production and are not committed to the repository.

## Testing

```bash
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

Coverage includes service-level tests and e2e tests. The e2e suite verifies the main order flow: login, order creation, stock decrease, asynchronous status transition to `processed`, idempotent duplicate submissions, validation errors, and business errors for insufficient stock.

## Observability

- `GET /api/health` exposes the health check used by CI/CD smoke tests.
- `HttpLoggerMiddleware` logs every HTTP request.
- `CorrelationIdMiddleware` attaches or generates `x-correlation-id`.
- `OrdersService` logs order creation and idempotency behavior.
- `OrdersWorkerService` logs RabbitMQ message receipt, retry scheduling, DLQ routing, and successful processing.
- RabbitMQ Management UI is available locally at http://localhost:15672 to inspect `orders.process` and `orders.dlq`.

Useful local log commands:

```bash
docker compose logs -f api
docker compose logs -f rabbitmq
```

For deployed environments, inspect logs on the VM with the matching Compose project:

```bash
docker compose -f compose.prod.yml -p stage logs -f api
docker compose -f compose.prod.yml -p prod logs -f api
```

## CI/CD

GitHub Actions runs PR validation, builds immutable Docker images, deploys stage automatically, and deploys production manually using the same image artifact.

Full CI/CD documentation was moved to [docs/task-9-ci-cd.md](./docs/task-9-ci-cd.md).

## Additional Documentation

- [Task 3: transactions, idempotency, concurrency, SQL optimization](./docs/task-3-transactions.md)
- [Task 7: RabbitMQ background processing, retries, and DLQ](./docs/task-7-rabbitmq.md)
- [Task 9: CI/CD pipeline](./docs/task-9-ci-cd.md)
