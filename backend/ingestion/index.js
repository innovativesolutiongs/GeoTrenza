require("dotenv").config();
require("reflect-metadata");

const net = require("net");
const AppDataSource = require("./ormconfig");

const parse0900 = require("./utils/trackeruplorddatatoserver");
const generateAck = require("./utils/ackGenerator");
const handle0x0102 = require("./handlers/handle0x0102");
const handle0x0002 = require("./handlers/handle0x0002");
const handle0x0200 = require("./handlers/handle0x0200");
const logger = require("./utils/logger");

const PORT = process.env.TCP_PORT || 5000;

logger.info("server_starting");

AppDataSource.initialize().then(() => {

  const deviceRepo = AppDataSource.getRepository("Device");
  const commandRepo = AppDataSource.getRepository("CommandReply");

  const handlerDeps = {
    dataSource: AppDataSource,
    deviceRepo,
    logger,
  };

  const server = net.createServer((socket) => {

    logger.info("device_connected", { remoteAddress: socket.remoteAddress });
    const connState = { deviceId: undefined };

    socket.on("data", async (data) => {

      try {

        const hex = data.toString("hex").toUpperCase();

        const messageId = hex.substring(2, 6);
        const terminalId = hex.substring(10, 22);

        logger.info("packet_received", { messageId, terminalId, hex });

        let handlerAck;
        let shouldClose = false;

        switch (messageId) {

          /* ================= AUTHORIZATION (0x0102 handler — Stage 2 Phase B Step 5) ================= */

          case "0102": {

            const serialNo = parseInt(hex.substring(22, 26), 16);

            handlerAck = await handle0x0102(hex, connState, {
              ...handlerDeps,
              serialNo,
              originalMsgId: 0x0102,
            });

            if (handlerAck.result !== 0) {
              shouldClose = true;
            }

            break;
          }


          /* ================= HEARTBEAT (0x0002 handler — Stage 2 Phase C) ================= */

          case "0002": {

            const serialNo = parseInt(hex.substring(22, 26), 16);

            handlerAck = await handle0x0002(hex, connState, {
              ...handlerDeps,
              serialNo,
              originalMsgId: 0x0002,
            });

            break;
          }


          /* ================= GPS DATA (0x0200 orchestrator — Stage 2 Phase B Step 4) ================= */

          case "0200": {

            const serialNo = parseInt(hex.substring(22, 26), 16);

            handlerAck = await handle0x0200(hex, connState, {
              ...handlerDeps,
              serialNo,
              originalMsgId: 0x0200,
            });

            break;
          }


          /* ================= COMMAND REPLY ================= */

          case "0300": {

            const commandData = hex.substring(26, hex.length - 4);

            await commandRepo.save({
              terminalId,
              command: commandData
            });

            logger.info("command_reply_saved", { terminalId });

            break;
          }


          /* ================= TRANSPARENT DATA ================= */

          case "0900": {

            const transparent = parse0900(hex);

            await commandRepo.save({
              terminalId,
              command: transparent.data
            });

            logger.info("transparent_data_saved", { terminalId });

            break;
          }


          /* ================= SERVER COMMAND ================= */

          case "8300":

            logger.info("server_command_packet", { terminalId });

            break;


          /* ================= DOWNLOAD ================= */

          case "8900":

            logger.info("download_packet", { terminalId });

            break;


          default:

            logger.warn("unknown_packet", { messageId, terminalId });

        }


        /* ================= ACK ================= */

        const ackResult = handlerAck ? handlerAck.result : 0;
        const ack = generateAck(hex, ackResult);

        socket.write(ack);

        logger.info("ack_sent", { messageId, result: ackResult, ackHex: ack.toString("hex") });

        if (shouldClose) {
          logger.info("connection_closed_auth_failed", { remoteAddress: socket.remoteAddress });
          socket.end();
        }

      } catch (err) {

        logger.error("packet_error", { message: err && err.message, stack: err && err.stack });

      }

    });

    socket.on("error", (err) => {
      logger.error("socket_error", { message: err && err.message });
    });

    socket.on("close", () => {
      logger.info("device_disconnected", { remoteAddress: socket.remoteAddress });
    });

  });

  server.listen(PORT, () => {
    logger.info("server_listening", { port: PORT });
  });

});
