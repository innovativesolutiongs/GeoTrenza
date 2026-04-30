import { DataSource } from "typeorm";

import { Trucks } from "./entity/truck";
import { User } from "./entity/User";
import { Account } from "./entity/account";
import { Devices } from "./entity/device";
import { allocation } from "./entity/allocation";


export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "123456",
  database: "realtimedb",

  // realtime
  entities: [
    User, Trucks, Account, Devices, allocation
  ],
  logging: true,
  synchronize: false,
  migrationsRun: false,
});
