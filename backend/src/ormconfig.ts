import "dotenv/config";
import { DataSource } from "typeorm";

import { Trucks } from "./entity/truck";
import { User } from "./entity/User";
import { Account } from "./entity/account";
import { Devices } from "./entity/device";
import { allocation } from "./entity/allocation";
import { Position } from "./entity/position";
import { Event } from "./entity/event";
import { Geofence } from "./entity/geofence";

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
  entities: [User, Trucks, Account, Devices, allocation, Position, Event, Geofence],
  migrations: ["src/migration/*.ts"],
  logging: true,
  // Schema management: synchronize is OFF. Migrations under src/migration/ are now
  // the ONLY mechanism that changes production schema — see docs/schema-v2.md.
  // Do NOT flip this back to true; the ingestion service's `synchronize: true` is
  // what produced the current production drift, and Stage 2 removes that path too.
  synchronize: false,
  // Migrations are run explicitly (e.g. via `typeorm migration:run`), not on app boot,
  // so a deploy that forgets to run them fails loudly at first query rather than
  // silently reshaping the schema.
  migrationsRun: false,
});
