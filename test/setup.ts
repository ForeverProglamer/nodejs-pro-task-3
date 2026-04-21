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
  postgresContainer = await new PostgreSqlContainer("postgres:17.4-alpine3.21")
    .withDatabase("test_db")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();
  rabbitmqContainer = await new RabbitMQContainer(
    "rabbitmq:4.2.4-management-alpine",
  ).start();

  process.env.DB_HOST = postgresContainer.getHost();
  process.env.DB_PORT = postgresContainer.getPort().toString();
  process.env.DB_USER = "postgres";
  process.env.DB_PASSWORD = "postgres";
  process.env.DB_NAME = "test_db";

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
  try {
    await postgresContainer?.stop();
  } finally {
    await rabbitmqContainer?.stop();
  }
});
