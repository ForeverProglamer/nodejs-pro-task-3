process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

process.env.JWT_AT_SECRET = process.env.JWT_AT_SECRET ?? "at-secret";
process.env.JWT_AT_MAX_AGE_S = process.env.JWT_AT_MAX_AGE_S ?? "3600";

process.env.JWT_RT_SECRET = process.env.JWT_RT_SECRET ?? "rt-secret";
process.env.JWT_RT_MAX_AGE_S = process.env.JWT_RT_MAX_AGE_S ?? "604800";

process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
process.env.DB_PORT = process.env.DB_PORT ?? "5432";
process.env.DB_USER = process.env.DB_USER ?? "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
process.env.DB_NAME = process.env.DB_NAME ?? "nest_task3_db";

process.env.WORKER_ENABLE = process.env.WORKER_ENABLE ?? "false";
process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? "amqp://user:password@localhost";
