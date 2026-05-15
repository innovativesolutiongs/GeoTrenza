const { categorizeError } = require('../errors/errorCategories');

const PLATFORM_ACK_MSG_ID = 0x8001;

async function handle0x0102(packetHex, connState, deps) {
  const { deviceRepo, serialNo, originalMsgId } = deps;

  try {
    const terminalId = packetHex.substring(10, 22);
    const authCode = packetHex.substring(26, packetHex.length - 4);

    const device = await deviceRepo.findOne({ where: { terminal_id: terminalId } });

    if (!device) {
      deps.logger.info('auth_unknown_device', { terminalId });
      return buildAck(serialNo, originalMsgId, 1);
    }

    if (!device.auth_code || device.auth_code.toUpperCase() !== authCode.toUpperCase()) {
      deps.logger.info('auth_code_mismatch', { terminalId, deviceId: device.id });
      return buildAck(serialNo, originalMsgId, 1);
    }

    connState.deviceId = device.id;
    deps.logger.info('auth_success', { terminalId, deviceId: device.id });
    return buildAck(serialNo, originalMsgId, 0);
  } catch (err) {
    const category = categorizeError(err);
    deps.logger[category.logLevel]('auth_handler_error', {
      category: category.category,
      message: err && err.message,
    });
    return buildAck(serialNo, originalMsgId, category.ackResult);
  }
}

function buildAck(serialNo, originalMsgId, result) {
  return {
    msgId: PLATFORM_ACK_MSG_ID,
    serialNo,
    originalMsgId,
    result,
  };
}

module.exports = handle0x0102;
