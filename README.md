# E-commerce Platform

## Quick start

Requirements:
- Node.js (v24.13.0)
- npm
- Docker & Docker Compose

```bash
cp .env.example .env
npm ci # Install deps on your local machine for IDE support
npm run compose:up # Start app and infra
npm run compose:ps # Ensure everything is running

# Later, when you are done...
npm run compose:down # Shut down app and infra
```

Accessing services:
- API: http://localhost:3000
- Postgres: http://localhost:5432
- RabbitMQ: http://localhost:5672
- RabbitMQ Web UI: http://localhost:15672

> NOTE: See `.env.example` / `.env` for service credentials.

Available one-off jobs:
- Migrate DB: `docker compose run --rm migrate`
- Seed DB: `docker compose --profile seed run --rm seed`

## Bruno API Collection

`./api-collection` contains a couple of endpoints for API testing 
that you can import.

## CI/CD (Task 9)
