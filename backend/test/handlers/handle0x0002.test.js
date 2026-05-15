const handle0x0002 = require('../../ingestion/handlers/handle0x0002');
const { QueryFailedError } = require('typeorm');

function makeDeviceRepo(updateImpl) {
  return { update: jest.fn(updateImpl) };
}

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

// Heartbeat packet hex shape: 10 chars filler + terminalId (12) + serial (4) + trailing 4
function makePacket(terminalId = '690106149138') {
  return '0'.repeat(10) + terminalId + '0001' + 'XX7E';
}

describe('handle0x0002', () => {
  test('1. happy path: deviceId in connState, update succeeds → ack result 0', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ affected: 1 }));
    const logger = makeLogger();
    const connState = { deviceId: '42' };

    const ack = await handle0x0002(makePacket(), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0002,
    });

    expect(ack).toEqual({ msgId: 0x8001, serialNo: 1, originalMsgId: 0x0002, result: 0 });
    expect(deviceRepo.update).toHaveBeenCalledTimes(1);
    expect(deviceRepo.update.mock.calls[0][0]).toBe('42');
    expect(deviceRepo.update.mock.calls[0][1]).toHaveProperty('last_seen_at');
    expect(deviceRepo.update.mock.calls[0][1].last_seen_at).toBeInstanceOf(Date);
    expect(logger.info).toHaveBeenCalledWith('heartbeat_handled', { deviceId: '42' });
  });

  test('2. pre-auth heartbeat (deviceId undefined) → warn logged, ack result 1, no update', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ affected: 1 }));
    const logger = makeLogger();
    const connState = { deviceId: undefined };

    const ack = await handle0x0002(makePacket('690106149138'), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0002,
    });

    expect(ack.result).toBe(1);
    expect(deviceRepo.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('heartbeat_pre_auth', { terminalId: '690106149138' });
  });

  test('3. update throws QueryFailedError (08006 connection failure) → ack result 1, logged at error', async () => {
    const driverErr = { code: '08006', message: 'connection failed' };
    const deviceRepo = makeDeviceRepo(async () => { throw new QueryFailedError('UPDATE', [], driverErr); });
    const logger = makeLogger();
    const connState = { deviceId: '42' };

    const ack = await handle0x0002(makePacket(), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0002,
    });

    expect(ack.result).toBe(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][1].category).toBe('DB_CONNECTION_ERROR');
    expect(logger.error.mock.calls[0][1].deviceId).toBe('42');
  });

  test('4. bigint deviceId (2^53 + 1) passes through to deviceRepo.update unchanged', async () => {
    const bigId = '9007199254740993';
    const deviceRepo = makeDeviceRepo(async () => ({ affected: 1 }));
    const logger = makeLogger();
    const connState = { deviceId: bigId };

    const ack = await handle0x0002(makePacket(), connState, {
      deviceRepo, logger, serialNo: 1, originalMsgId: 0x0002,
    });

    expect(ack.result).toBe(0);
    expect(deviceRepo.update.mock.calls[0][0]).toBe(bigId);
    expect(typeof deviceRepo.update.mock.calls[0][0]).toBe('string');
  });

  test('5. ACK structure matches Mobicom V2.2 (msgId 0x8001 + serialNo + originalMsgId + result)', async () => {
    const deviceRepo = makeDeviceRepo(async () => ({ affected: 1 }));
    const logger = makeLogger();

    const ack = await handle0x0002(makePacket(), { deviceId: '42' }, {
      deviceRepo, logger, serialNo: 99, originalMsgId: 0x0002,
    });

    expect(Object.keys(ack).sort()).toEqual(['msgId', 'originalMsgId', 'result', 'serialNo']);
    expect(ack.msgId).toBe(0x8001);
    expect(ack.serialNo).toBe(99);
    expect(ack.originalMsgId).toBe(0x0002);
  });
});
