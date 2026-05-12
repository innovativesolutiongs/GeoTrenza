require("dotenv").config();
require("reflect-metadata");

const net = require("net");
const AppDataSource = require("./ormconfig");

const parseLocation = require("./utils/gpsParser");
const parseAlarm = require("./utils/alarmParser");
const parseStatus = require("./utils/statusParser");
const parseLocationExtra = require("./utils/locationExtraParser");
const parseExtraMessages = require("./utils/extraMessageParser");
const parse0900 = require("./utils/trackeruplorddatatoserver");
const generateAck = require("./utils/ackGenerator");
const buildCommand = require("./utils/commandBuilder");
const COMMANDS = require("./utils/trackerCommands");

const PORT = process.env.TCP_PORT || 5000;

console.log("🚀 Starting TCP Server...");

AppDataSource.initialize().then(() => {

  const deviceRepo = AppDataSource.getRepository("Device");
  const gpsRepo = AppDataSource.getRepository("GpsData");
  const heartbeatRepo = AppDataSource.getRepository("Heartbeat");
  const commandRepo = AppDataSource.getRepository("CommandReply");
  const alarmRepo = AppDataSource.getRepository("GpsAlarm");
  const statusRepo = AppDataSource.getRepository("GpsStatus");
  const extraRepo = AppDataSource.getRepository("GpsExtraLocation");
  const extraDataRepo = AppDataSource.getRepository("GpsExtraDatamsg");

  const server = net.createServer((socket) => {

    console.log("📡 Device Connected:", socket.remoteAddress);

    socket.on("data", async (data) => {

      try {

        const hex = data.toString("hex").toUpperCase();

        console.log("📦 Packet:", hex);

        const messageId = hex.substring(2, 6);
        const terminalId = hex.substring(10, 22);

        console.log("MessageID:", messageId);
        console.log("Terminal:", terminalId);

        switch (messageId) {

          /* ================= AUTHORIZATION ================= */

          case "0102":

            const authCode = hex.substring(26, hex.length - 4);

            await deviceRepo.save({
              terminalId,
              authCode
            });

            console.log("✅ Device Saved");

            break;


          /* ================= HEARTBEAT ================= */

          case "0002":

            await heartbeatRepo.save({
              terminalId
            });

            console.log("💓 Heartbeat Saved");

            break;


          /* ================= GPS DATA ================= */

          case "0200":

            const gps = parseLocation(hex);

            if (!gps) {
              console.log("GPS parse failed");
              return;
            }

            await gpsRepo.save({
              terminalId,
              latitude: gps.latitude,
              longitude: gps.longitude,
              speed: gps.speed
            });

            console.log("📍 GPS Saved");

            // DISABLED 2026-05-04 — auto engine-cut at speed > 100 is a safety risk.
            // To be redesigned in Stage 4 with: (1) explicit operator confirmation,
            // (2) geofence trigger, (3) speed = 0 requirement before sending
            // immobilizer command, (4) opt-in by customer.
            /*
            if (gps.speed > 100) {

              const packet = buildCommand(terminalId, COMMANDS.ENGINE_LOCK);

              socket.write(packet);

              console.log("🚨 Speed Limit! Engine Lock Command Sent");

            }
            */


            /* ---------- ALARM PARSE ---------- */

            const alarmHex = hex.substring(26, 34);
            const alarmValue = parseInt(alarmHex, 16);

            const alarms = parseAlarm(alarmValue);

            for (const alarm of alarms) {

              await alarmRepo.save({
                terminal_id: terminalId,
                alarm_type: alarm
              });

            }

            console.log("🚨 Alarm Detected:", alarms);


            /* ---------- STATUS PARSE ---------- */

            const statusHex = hex.substring(34, 42);
            const statusValue = parseInt(statusHex, 16);

            const statuses = parseStatus(statusValue);

            for (const status of statuses) {

              await statusRepo.save({
                terminal_id: terminalId,
                status_type: status
              });

            }

            console.log("📊 Status:", statuses);


            /* ---------- EXTRA LOCATION DATA ---------- */

            const extras = parseLocationExtra(hex);
            const extraMsg = parseExtraMessages(hex);

            // Most fields below come from parseLocationExtra (extras).
            // Four fields (alarm_event, temperature, fuel_sensor,
            // external_voltage) come from parseExtraMessages (extraMsg)
            // because parseLocationExtra doesn't decode those TLV IDs.
            // alarm_event remains effectively NULL — no parser emits
            // alarmEvent today (TLV 0x14 unimplemented). See
            // STAGE_2_KNOWN_BUGS.md Bug 5.
            await extraRepo.save({

              terminal_id: terminalId,

              mileage: extras.mileage || null,

              fuel: extras.fuel || null,

              speed_ext: extras.extendedSpeed || null,

              alarm_event: extraMsg.alarmEvent || null,

              signal_strength: extras.gsmSignal || null,

              satellites: extras.satellites || null,

              battery_voltage: extras.batteryVoltage || null,

              temperature: extraMsg.temperature || null,

              fuel_sensor: extraMsg.fuelSensor || null,

              external_voltage: extraMsg.externalVoltage || null

            });

            console.log("📊 Extra Location Saved:", extras);

            /* ---------- EXTRA Message DATA ---------- */



            await extraDataRepo.save({

              terminal_id: terminalId,

              message_id: extraMsg.message_id || null,

              mileage: extraMsg.mileage || null,

              fuel: extraMsg.fuel || null,

              gsm_signal: extraMsg.gsm_signal || null,

              gnss_signal: extraMsg.gnss_signal || null,

              battery_voltage: extraMsg.battery_voltage || null,

              battery_percent: extraMsg.battery_percent || null,

              temperature: extraMsg.temperature || null,

              humidity: extraMsg.humidity || null,

              raw_extra: extraMsg.raw || null

            });

            console.log("📊 Extra Data Saved:", extraMsg);

            break;


          /* ================= COMMAND REPLY ================= */

          case "0300":

            const commandData = hex.substring(26, hex.length - 4);

            await commandRepo.save({
              terminalId,
              command: commandData
            });

            console.log("📨 Command Reply Saved");

            break;


          /* ================= TRANSPARENT DATA ================= */

          case "0900":

            const transparent = parse0900(hex);

            await commandRepo.save({
              terminalId,
              command: transparent.data
            });

            console.log("📡 Transparent Data Saved");

            break;


          /* ================= SERVER COMMAND ================= */

          case "8300":

            console.log("📤 Command Packet");

            break;


          /* ================= DOWNLOAD ================= */

          case "8900":

            console.log("⬇️ Download Packet");

            break;


          default:

            console.log("❓ Unknown Packet");

        }


        /* ================= ACK ================= */

        const ack = generateAck(hex);

        socket.write(ack);

        console.log("📤 ACK Sent:", ack.toString("hex"));

      } catch (err) {

        console.log("⚠️ Packet Error:", err);

      }

    });

    socket.on("error", (err) => {
      console.log("Socket Error:", err.message);
    });

    socket.on("close", () => {
      console.log("❌ Device Disconnected");
    });

  });

  server.listen(PORT, () => {
    console.log(`✅ TCP Server running on port ${PORT}`);
  });

});