import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  RabbitMQContainer,
  StartedRabbitMQContainer,
} from "@testcontainers/rabbitmq";
import { AbstractStartedContainer } from "testcontainers";
import seed from "src/seed";

let postgresContainer: StartedPostgreSqlContainer | undefined;
let rabbitmqContainer: StartedRabbitMQContainer | undefined;

jest.setTimeout(120_000);

const isDefined = <T>(val: T | undefined): val is T => val !== undefined;

type MaybeStarted = AbstractStartedContainer | undefined;

const startContainers = async (): Promise<
  [StartedPostgreSqlContainer, StartedRabbitMQContainer]
> => {
  // Start all or fail strategy
  const results = await Promise.allSettled([
    new PostgreSqlContainer("postgres:17.4-alpine3.21").start(),
    new RabbitMQContainer("rabbitmq:4.2.4-management-alpine").start(),
  ]);

  const rejected = results.filter((r) => r.status === "rejected");
  const started = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  if (rejected.length > 0) {
    await stopContainers(...started);
    throw new AggregateError(
      rejected.map((r) => r.reason),
      "Failed to start containers",
    );
  }
  return started as [StartedPostgreSqlContainer, StartedRabbitMQContainer];
};

const stopContainers = async (...containers: MaybeStarted[]) => {
  await Promise.allSettled(containers.filter(isDefined).map((c) => c.stop()));
};

const initializeEnv = (
  pg: StartedPostgreSqlContainer,
  rabbit: StartedRabbitMQContainer,
) => {
  process.env.DB_HOST = pg.getHost();
  process.env.DB_PORT = pg.getPort().toString();
  process.env.DB_USER = pg.getUsername();
  process.env.DB_PASSWORD = pg.getPassword();
  process.env.DB_NAME = pg.getDatabase();

  process.env.RABBITMQ_URL = rabbit.getAmqpUrl();
};

const initializeDb = async () => {
  const { default: appDataSource } = await import("../data-source");
  try {
    await appDataSource.initialize();
    await appDataSource.runMigrations();
    await seed({ ds: appDataSource });
  } finally {
    if (appDataSource?.isInitialized) {
      await appDataSource.destroy();
    }
  }
};

beforeAll(async () => {
  [postgresContainer, rabbitmqContainer] = await startContainers();
  try {
    initializeEnv(postgresContainer, rabbitmqContainer);
    await initializeDb();
  } catch (err) {
    await stopContainers(postgresContainer, rabbitmqContainer);
    postgresContainer = undefined;
    rabbitmqContainer = undefined;
    throw err;
  }
});

afterAll(async () => {
  await stopContainers(postgresContainer, rabbitmqContainer);
  postgresContainer = undefined;
  rabbitmqContainer = undefined;
});
