process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
process.env.DB_PORT = process.env.DB_PORT ?? "5432";
process.env.DB_USER = process.env.DB_USER ?? "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
process.env.DB_NAME = process.env.DB_NAME ?? "nest_task3_db";
process.env.WORKER_ENABLE = process.env.WORKER_ENABLE ?? "false";
process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? "amqp://user:password@localhost";
