const parseLocationPacket = require('../utils/locationPacketParser');
const buildPositionRow = require('../utils/buildPositionRow');
const detectOneShotEvents = require('../utils/detectOneShotEvents');
const executeTransaction = require('../utils/executeTransaction');
const resolveDeviceId = require('../utils/resolveDeviceId');
const { categorizeError } = require('../errors/errorCategories');
const ParseError = require('../errors/ParseError');

const PLATFORM_ACK_MSG_ID = 0x8001;
const RAW_HEX_TRUNCATE = 400;

async function handle0x0200(packetHex, connState, deps) {
  const { dataSource, deviceRepo, serialNo, originalMsgId } = deps;
  const receivedAt = new Date();

  let packetData;
  try {
    packetData = parseLocationPacket(packetHex);
  } catch (err) {
    const truncatedHex = packetHex ? packetHex.substring(0, RAW_HEX_TRUNCATE) : '';
    const parseErr = new ParseError(err.message || 'parse failed', truncatedHex);
    return handleError(parseErr, deps, serialNo, originalMsgId, connState);
  }

  let deviceId;
  try {
    if (connState.deviceId) {
      deviceId = connState.deviceId;
    } else {
      deviceId = await resolveDeviceId(packetData.terminalId, deviceRepo);
      connState.deviceId = deviceId;
    }
  } catch (err) {
    return handleError(err, deps, serialNo, originalMsgId, connState);
  }

  const positionRow = buildPositionRow(packetData, deviceId, receivedAt);
  const { events, maintainedBitsSet } = detectOneShotEvents(
    packetData.alarmBits,
    null, // position_id filled in by executeTransaction after position INSERT
    packetData.recordedAt,
    deviceId
  );

  if (maintainedBitsSet.length > 0) {
    deps.logger.info('maintained_alarm_bits_detected', {
      terminalId: packetData.terminalId,
      deviceId,
      bits: maintainedBitsSet,
      recordedAt: packetData.recordedAt,
    });
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  const txStart = Date.now();
  try {
    await executeTransaction(positionRow, events, deviceId, queryRunner);
    deps.logger.info('position_handled', {
      terminalId: packetData.terminalId,
      deviceId,
      packet_size_bytes: Math.floor(packetHex.length / 2),
      event_count_emitted: events.length,
      transaction_duration_ms: Date.now() - txStart,
    });
    return buildAck(serialNo, originalMsgId, 0);
  } catch (err) {
    return handleError(err, deps, serialNo, originalMsgId, connState);
  } finally {
    await queryRunner.release();
  }
}

function handleError(err, deps, serialNo, originalMsgId, connState) {
  const category = categorizeError(err);

  deps.logger[category.logLevel]('handler_error', {
    category: category.category,
    message: err && err.message,
    terminalId: err && err.terminalId,
    rawHex: err && err.rawHex,
    deviceId: connState && connState.deviceId,
  });

  return buildAck(serialNo, originalMsgId, category.ackResult);
}

// ACK structure per Mobicom JT/T 808 V2.2 Table 5-1 (Platform Universal ACK 0x8001):
// body = serialNo (uint16) + originalMsgId (uint16) + result (uint8)
function buildAck(serialNo, originalMsgId, result) {
  return {
    msgId: PLATFORM_ACK_MSG_ID,
    serialNo,
    originalMsgId,
    result,
  };
}

module.exports = handle0x0200;
