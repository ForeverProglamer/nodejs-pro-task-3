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

let postgresContainer: StartedPostgreSqlContainer;
let rabbitmqContainer: StartedRabbitMQContainer;

jest.setTimeout(120_000);

beforeAll(async () => {
  [postgresContainer, rabbitmqContainer] = await Promise.all([
    new PostgreSqlContainer("postgres:17.4-alpine3.21").start(),
    new RabbitMQContainer("rabbitmq:4.2.4-management-alpine").start(),
  ]);

  process.env.DB_HOST = postgresContainer.getHost();
  process.env.DB_PORT = postgresContainer.getPort().toString();
  process.env.DB_USER = postgresContainer.getUsername();
  process.env.DB_PASSWORD = postgresContainer.getPassword();
  process.env.DB_NAME = postgresContainer.getDatabase();

  process.env.RABBITMQ_URL = rabbitmqContainer.getAmqpUrl();

  const { default: AppDataSource } = await import("../data-source");

  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();

    const usersRepo = AppDataSource.getRepository(User);
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
  } catch (err) {
    console.error(err);
  } finally {
    await AppDataSource.destroy();
  }
});

afterAll(async () => {
  await Promise.allSettled([
    postgresContainer?.stop(),
    rabbitmqContainer?.stop(),
  ]);
});
