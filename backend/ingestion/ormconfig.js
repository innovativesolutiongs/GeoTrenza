require("dotenv").config();
require("reflect-metadata");
const { DataSource } = require("typeorm");

const Device = require("./entities/Device");
const GpsData = require("./entities/GPS");
const Heartbeat = require("./entities/Heartbeat");
const CommandReply = require("./entities/CommandReply");
const GpsAlarm = require("./entities/GpsAlarm");
const GpsStatus = require("./entities/GpsStatus");
const GpsExtraLocation = require("./entities/GpsExtraLocation");
const GpsExtraDatamsg = require("./entities/GpsExtraDatamsg");



const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || "gpstracker",
  synchronize: true,
  logging: false,
  entities: [Device, GpsData, Heartbeat, CommandReply, GpsAlarm, GpsStatus, GpsExtraLocation, GpsExtraDatamsg],
});

AppDataSource.initialize()
  .then(() => {
    console.log("✅ PostgreSQL Connected with TypeORM");
  })
  .catch((err) => {
    console.error("❌ Database Error:", err);
  });

module.exports = AppDataSource;