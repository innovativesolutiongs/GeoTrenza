const { categorizeError } = require('../errors/errorCategories');

const PLATFORM_ACK_MSG_ID = 0x8001;

async function handle0x0002(packetHex, connState, deps) {
  const { deviceRepo, serialNo, originalMsgId } = deps;

  try {
    if (!connState.deviceId) {
      const terminalId = packetHex.substring(10, 22);
      deps.logger.warn('heartbeat_pre_auth', { terminalId });
      return buildAck(serialNo, originalMsgId, 1);
    }

    await deviceRepo.update(connState.deviceId, { last_seen_at: new Date() });
    deps.logger.info('heartbeat_handled', { deviceId: connState.deviceId });
    return buildAck(serialNo, originalMsgId, 0);
  } catch (err) {
    const category = categorizeError(err);
    deps.logger[category.logLevel]('heartbeat_error', {
      category: category.category,
      message: err && err.message,
      deviceId: connState.deviceId,
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

module.exports = handle0x0002;
