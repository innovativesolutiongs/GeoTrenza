const handle0x0102 = require('../../ingestion/handlers/handle0x0102');
const { QueryFailedError } = require('typeorm');

function makeDeviceRepo(findOneImpl) {
  return { findOne: jest.fn(findOneImpl) };
}

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

// Construct a 0x0102 packet hex string:
//   header (10 chars filler) + terminalId (12) + serial (4) + authCode + trailing 4 (checksum + 7E)
// The handler only reads substring(10, 22) and substring(26, length - 4).
function makePacket(terminalId, authCode) {
  return '0'.repeat(10) + terminalId + '0001' + authCode + 'XX7E';
}

const TERMINAL = '690106149138';
const AUTH = 'ABCDEF';

describe('handle0x0102', () => {
  test('1. happy path: device found + auth_code matches → connState.deviceId set, ack result 0', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ id: '42', terminal_id: TERMINAL, auth_code: AUTH }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(connState.deviceId).toBe('42');
    expect(ack).toEqual({ msgId: 0x8001, serialNo: 1, originalMsgId: 0x0102, result: 0 });
    expect(deviceRepo.findOne).toHaveBeenCalledWith({ where: { terminal_id: TERMINAL } });
  });

  test('2. device not found → ack result 1, connState unchanged, logged as auth_unknown_device', async () => {
    const deviceRepo = makeDeviceRepo(async () => null);
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(1);
    expect(connState.deviceId).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith('auth_unknown_device', { terminalId: TERMINAL });
  });

  test('3. auth_code mismatch → ack result 1, connState unchanged, logged as auth_code_mismatch', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ id: '42', terminal_id: TERMINAL, auth_code: 'WRONGCODE' }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(1);
    expect(connState.deviceId).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith('auth_code_mismatch', { terminalId: TERMINAL, deviceId: '42' });
  });

  test('4. auth_code comparison is case-insensitive (device stored lowercase, packet uppercase)', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ id: '42', terminal_id: TERMINAL, auth_code: 'abcdef' }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, 'ABCDEF'), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(0);
    expect(connState.deviceId).toBe('42');
  });

  test('5. device exists but auth_code is null → ack result 1, connState unchanged', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ id: '42', terminal_id: TERMINAL, auth_code: null }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(1);
    expect(connState.deviceId).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith('auth_code_mismatch', { terminalId: TERMINAL, deviceId: '42' });
  });

  test('6. deviceRepo.findOne throws (QueryFailedError) → ack result 1, logged at error level', async () => {
    const driverErr = { code: '08006', message: 'connection failed' };
    const deviceRepo = makeDeviceRepo(async () => { throw new QueryFailedError('SELECT', [], driverErr); });
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(1);
    expect(connState.deviceId).toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][1].category).toBe('DB_CONNECTION_ERROR');
  });

  test('7. bigint device.id (2^53 + 1) cached on connState as string, no coercion', async () => {
    const bigId = '9007199254740993';
    const deviceRepo = makeDeviceRepo(async () => ({ id: bigId, terminal_id: TERMINAL, auth_code: AUTH }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0102,
    });

    expect(ack.result).toBe(0);
    expect(connState.deviceId).toBe(bigId);
    expect(typeof connState.deviceId).toBe('string');
  });

  test('8. ACK structure matches Mobicom V2.2 (msgId 0x8001 + serialNo + originalMsgId + result)', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ id: '42', terminal_id: TERMINAL, auth_code: AUTH }));
    const logger = makeLogger();

    const ack = await handle0x0102(makePacket(TERMINAL, AUTH), { deviceId: undefined }, {
      deviceRepo, logger, serialNo: 99, originalMsgId: 0x0102,
    });

    expect(Object.keys(ack).sort()).toEqual(['msgId', 'originalMsgId', 'result', 'serialNo']);
    expect(ack.msgId).toBe(0x8001);
    expect(ack.serialNo).toBe(99);
    expect(ack.originalMsgId).toBe(0x0102);
  });
});
