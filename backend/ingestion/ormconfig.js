require("dotenv").config();
require("reflect-metadata");
const { DataSource } = require("typeorm");

const Device = require("./entities/Device");
const CommandReply = require("./entities/CommandReply");
const Position = require("./entities/Position");
const Event = require("./entities/Event");
const Vehicle = require("./entities/Vehicle");
const Geofence = require("./entities/Geofence");



const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || "gpstracker",
  synchronize: false,
  logging: false,
  entities: [Device, CommandReply, Position, Event, Vehicle, Geofence],
});

AppDataSource.initialize()
  .then(() => {
    console.log("✅ PostgreSQL Connected with TypeORM");
  })
  .catch((err) => {
    console.error("❌ Database Error:", err);
  });

module.exports = AppDataSource;