require("dotenv").config();
require("reflect-metadata");

const net = require("net");
const AppDataSource = require("./ormconfig");

const parse0900 = require("./utils/trackeruplorddatatoserver");
const generateAck = require("./utils/ackGenerator");
const handle0x0200 = require("./handlers/handle0x0200");
const logger = require("./utils/logger");

const PORT = process.env.TCP_PORT || 5000;

console.log("🚀 Starting TCP Server...");

AppDataSource.initialize().then(() => {

  const deviceRepo = AppDataSource.getRepository("Device");
  const heartbeatRepo = AppDataSource.getRepository("Heartbeat");
  const commandRepo = AppDataSource.getRepository("CommandReply");

  const handlerDeps = {
    dataSource: AppDataSource,
    deviceRepo,
    logger,
  };

  const server = net.createServer((socket) => {

    console.log("📡 Device Connected:", socket.remoteAddress);
    const connState = { deviceId: undefined };

    socket.on("data", async (data) => {

      try {

        const hex = data.toString("hex").toUpperCase();

        console.log("📦 Packet:", hex);

        const messageId = hex.substring(2, 6);
        const terminalId = hex.substring(10, 22);

        console.log("MessageID:", messageId);
        console.log("Terminal:", terminalId);

        let handlerAck;

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


          /* ================= GPS DATA (0x0200 orchestrator — Stage 2 Phase B Step 4) ================= */

          case "0200": {

            const serialNo = parseInt(hex.substring(22, 26), 16);

            handlerAck = await handle0x0200(hex, connState, {
              ...handlerDeps,
              serialNo,
              originalMsgId: 0x0200,
            });

            console.log("📍 0x0200 handled, ack result:", handlerAck.result);

            break;
          }


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

        const ackResult = handlerAck ? handlerAck.result : 0;
        const ack = generateAck(hex, ackResult);

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
