import "dotenv/config";
import { DataSource } from "typeorm";

const buildPrefix = __filename.endsWith(".js") ? "dist/" : "";

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [`${buildPrefix}src/**/*.entity{.ts,.js}`],
  migrations: [`${buildPrefix}src/migrations/*{.ts,.js}`],
  synchronize: false,
});

export default AppDataSource;
