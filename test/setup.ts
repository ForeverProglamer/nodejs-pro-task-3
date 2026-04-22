import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  RabbitMQContainer,
  StartedRabbitMQContainer,
} from "@testcontainers/rabbitmq";
import User, { UserRole } from "src/users/user.entity";
import { hash } from "src/auth/utils";
import { USER_EMAIL, USER_PASS } from "src/seed/constants";
import type { DataSource } from "typeorm";
import { AbstractStartedContainer } from "testcontainers";

let postgresContainer: StartedPostgreSqlContainer;
let rabbitmqContainer: StartedRabbitMQContainer;

jest.setTimeout(120_000);

const isDefined = <T>(val: T | undefined): val is T => val !== undefined;

type MaybeStarted = AbstractStartedContainer | undefined;

const startContainers = async (): Promise<
  [StartedPostgreSqlContainer, StartedRabbitMQContainer]
> => {
  const [pg, rabbit] = await Promise.all([
    new PostgreSqlContainer("postgres:17.4-alpine3.21").start(),
    new RabbitMQContainer("rabbitmq:4.2.4-management-alpine").start(),
  ]);
  return [pg, rabbit];
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
  let appDataSource: DataSource | undefined;
  ({ default: appDataSource } = await import("../data-source"));
  try {
    await appDataSource.initialize();
    await appDataSource.runMigrations();

    const usersRepo = appDataSource.getRepository(User);
    const user = await usersRepo.findOne({
      where: { email: USER_EMAIL },
    });
    if (!user) {
      await usersRepo.save({
        email: USER_EMAIL,
        password: await hash(USER_PASS),
        role: UserRole.USER,
      });
    }
  } finally {
    if (appDataSource?.isInitialized) {
      await appDataSource.destroy();
    }
  }
};

beforeAll(async () => {
  try {
    [postgresContainer, rabbitmqContainer] = await startContainers();
    initializeEnv(postgresContainer, rabbitmqContainer);
    await initializeDb();
  } catch (err) {
    await stopContainers(postgresContainer, rabbitmqContainer);
    postgresContainer = undefined as never;
    rabbitmqContainer = undefined as never;
    throw err;
  }
});

afterAll(async () => {
  if (!postgresContainer && !rabbitmqContainer) return;
  await stopContainers(postgresContainer, rabbitmqContainer);
  postgresContainer = undefined as never;
  rabbitmqContainer = undefined as never;
});
