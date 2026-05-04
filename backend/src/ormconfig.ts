import "dotenv/config";
import { DataSource } from "typeorm";

import { Trucks } from "./entity/truck";
import { User } from "./entity/User";
import { Account } from "./entity/account";
import { Devices } from "./entity/device";
import { allocation } from "./entity/allocation";

const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

if (!DB_HOST || !DB_PORT || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
  throw new Error(
    "Missing database environment variables. Required: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME. See backend/.env.example."
  );
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: DB_HOST,
  port: Number(DB_PORT),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  entities: [User, Trucks, Account, Devices, allocation],
  migrations: ["src/migration/*.ts"],
  logging: true,
  synchronize: false,
  migrationsRun: false,
});
