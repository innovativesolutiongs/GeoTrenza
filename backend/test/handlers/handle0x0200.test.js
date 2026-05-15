jest.mock('../../ingestion/utils/locationPacketParser');
jest.mock('../../ingestion/utils/buildPositionRow');
jest.mock('../../ingestion/utils/detectOneShotEvents');
jest.mock('../../ingestion/utils/executeTransaction');
jest.mock('../../ingestion/utils/resolveDeviceId');

const handle0x0200 = require('../../ingestion/handlers/handle0x0200');
const parseLocationPacket = require('../../ingestion/utils/locationPacketParser');
const buildPositionRow = require('../../ingestion/utils/buildPositionRow');
const detectOneShotEvents = require('../../ingestion/utils/detectOneShotEvents');
const executeTransaction = require('../../ingestion/utils/executeTransaction');
const resolveDeviceId = require('../../ingestion/utils/resolveDeviceId');
const ParseError = require('../../ingestion/errors/ParseError');
const UnknownDeviceError = require('../../ingestion/errors/UnknownDeviceError');
const { QueryFailedError } = require('typeorm');

function makePacketData(overrides = {}) {
  return {
    terminalId: '690106149138',
    recordedAt: new Date('2026-05-15T10:00:00.000Z'),
    latitude: 12.34,
    longitude: 56.78,
    speed: 50,
    direction: 90,
    altitude: 100,
    alarmBits: 0,
    statusBits: 0,
    extras: {},
    ...overrides,
  };
}

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeQueryRunner() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
}

function makeDataSource(queryRunner) {
  return { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
}

function makeDeps({ logger, queryRunner, serialNo = 1, originalMsgId = 0x0200 } = {}) {
  return {
    dataSource: makeDataSource(queryRunner),
    deviceRepo: {},
    logger,
    serialNo,
    originalMsgId,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  parseLocationPacket.mockReturnValue(makePacketData());
  buildPositionRow.mockReturnValue({ device_id: '42', latitude: 12.34, longitude: 56.78 });
  detectOneShotEvents.mockReturnValue({ events: [], maintainedBitsSet: [] });
  executeTransaction.mockResolvedValue(undefined);
  resolveDeviceId.mockResolvedValue('42');
});

describe('handle0x0200', () => {
  test('1. happy path with cached deviceId — resolveDeviceId NOT called, ack result 0', async () => {
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    const ack = await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(resolveDeviceId).not.toHaveBeenCalled();
    expect(executeTransaction).toHaveBeenCalledTimes(1);
    expect(ack).toEqual({ msgId: 0x8001, serialNo: 1, originalMsgId: 0x0200, result: 0 });
  });

  test('2. cold connState — resolveDeviceId called and result cached into connState', async () => {
    resolveDeviceId.mockResolvedValue('77');
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });
    const connState = {};

    const ack = await handle0x0200('beef', connState, deps);

    expect(resolveDeviceId).toHaveBeenCalledWith('690106149138', deps.deviceRepo);
    expect(connState.deviceId).toBe('77');
    expect(ack.result).toBe(0);
  });

  test('3. parser throws → ParseError wrapped with truncated rawHex, ack result 2, no DB calls', async () => {
    parseLocationPacket.mockImplementation(() => { throw new Error('bad packet'); });
    const longHex = 'a'.repeat(1000);
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    const ack = await handle0x0200(longHex, { deviceId: '42' }, deps);

    expect(ack.result).toBe(2);
    expect(deps.dataSource.createQueryRunner).not.toHaveBeenCalled();
    expect(executeTransaction).not.toHaveBeenCalled();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [logKey, logPayload] = logger.warn.mock.calls[0];
    expect(logKey).toBe('handler_error');
    expect(logPayload.category).toBe('PARSE_ERROR');
    expect(logPayload.message).toBe('bad packet');
    expect(logPayload.rawHex).toBe('a'.repeat(400));
  });

  test('4. resolveDeviceId throws UnknownDeviceError → ack result 1, no DB calls, connState unchanged', async () => {
    resolveDeviceId.mockRejectedValue(new UnknownDeviceError('690106149138'));
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });
    const connState = {};

    const ack = await handle0x0200('beef', connState, deps);

    expect(ack.result).toBe(1);
    expect(deps.dataSource.createQueryRunner).not.toHaveBeenCalled();
    expect(connState.deviceId).toBeUndefined();

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0][0]).toBe('handler_error');
    expect(logger.info.mock.calls[0][1].category).toBe('UNKNOWN_DEVICE');
  });

  test('5. executeTransaction throws QueryFailedError (pg 23505) → ack result 1, release still called', async () => {
    executeTransaction.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: '23505', message: 'dup key' })
    );
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    const ack = await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(ack.result).toBe(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][1].category).toBe('DB_CONSTRAINT_VIOLATION');
  });

  test('6. executeTransaction throws plain Error → ack result 1 (UNEXPECTED_ERROR), release still called', async () => {
    executeTransaction.mockRejectedValue(new Error('boom'));
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    const ack = await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(ack.result).toBe(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][1].category).toBe('UNEXPECTED_ERROR');
  });

  test('7. detectOneShotEvents called with null as positionId (option a wiring)', async () => {
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(detectOneShotEvents).toHaveBeenCalledTimes(1);
    expect(detectOneShotEvents.mock.calls[0][1]).toBeNull();
  });

  test('8. buildPositionRow receives parsed packet, deviceId, and a Date for receivedAt', async () => {
    const packetData = makePacketData();
    parseLocationPacket.mockReturnValue(packetData);
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(buildPositionRow).toHaveBeenCalledWith(packetData, '42', expect.any(Date));
  });

  test('9. executeTransaction receives positionRow, events, deviceId, queryRunner in order', async () => {
    const positionRow = { device_id: '42', latitude: 12.34 };
    const events = [{ device_id: '42', kind: 'alarm.sos' }];
    buildPositionRow.mockReturnValue(positionRow);
    detectOneShotEvents.mockReturnValue({ events, maintainedBitsSet: [] });
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: '42' }, deps);

    expect(executeTransaction).toHaveBeenCalledWith(positionRow, events, '42', queryRunner);
  });

  test('10. maintained alarm bits → logger.info("maintained_alarm_bits_detected", …)', async () => {
    detectOneShotEvents.mockReturnValue({ events: [], maintainedBitsSet: [1, 2, 4] });
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: '42' }, deps);

    const maintainedLogs = logger.info.mock.calls.filter(
      ([key]) => key === 'maintained_alarm_bits_detected'
    );
    expect(maintainedLogs).toHaveLength(1);
    const payload = maintainedLogs[0][1];
    expect(payload.bits).toEqual([1, 2, 4]);
    expect(payload.deviceId).toBe('42');
    expect(payload.terminalId).toBe('690106149138');
  });

  test('11. empty maintainedBitsSet → no maintained_alarm_bits_detected log', async () => {
    detectOneShotEvents.mockReturnValue({ events: [], maintainedBitsSet: [] });
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: '42' }, deps);

    const maintainedLogs = logger.info.mock.calls.filter(
      ([key]) => key === 'maintained_alarm_bits_detected'
    );
    expect(maintainedLogs).toHaveLength(0);
  });

  test('12. ACK structure matches Mobicom V2.2 (msgId 0x8001 + serialNo + originalMsgId + result), no extra keys, on success and error', async () => {
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner, serialNo: 99, originalMsgId: 0x0200 });

    const successAck = await handle0x0200('beef', { deviceId: '42' }, deps);
    expect(Object.keys(successAck).sort()).toEqual(['msgId', 'originalMsgId', 'result', 'serialNo']);
    expect(successAck).toEqual({ msgId: 0x8001, serialNo: 99, originalMsgId: 0x0200, result: 0 });

    parseLocationPacket.mockImplementation(() => { throw new Error('bad'); });
    const errAck = await handle0x0200('beef', { deviceId: '42' }, deps);
    expect(Object.keys(errAck).sort()).toEqual(['msgId', 'originalMsgId', 'result', 'serialNo']);
    expect(errAck.msgId).toBe(0x8001);
    expect(errAck.serialNo).toBe(99);
    expect(errAck.originalMsgId).toBe(0x0200);
  });

  test('13. queryRunner.release() called exactly once on both success and failure paths', async () => {
    const logger1 = makeLogger();
    const queryRunner1 = makeQueryRunner();
    const deps1 = makeDeps({ logger: logger1, queryRunner: queryRunner1 });

    await handle0x0200('beef', { deviceId: '42' }, deps1);
    expect(queryRunner1.release).toHaveBeenCalledTimes(1);

    executeTransaction.mockRejectedValue(new Error('boom'));
    const logger2 = makeLogger();
    const queryRunner2 = makeQueryRunner();
    const deps2 = makeDeps({ logger: logger2, queryRunner: queryRunner2 });

    await handle0x0200('beef', { deviceId: '42' }, deps2);
    expect(queryRunner2.release).toHaveBeenCalledTimes(1);
  });

  test('14. bigint deviceId (2^53 + 1) survives through orchestrator to executeTransaction unchanged', async () => {
    const bigId = '9007199254740993';
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });

    await handle0x0200('beef', { deviceId: bigId }, deps);

    expect(buildPositionRow).toHaveBeenCalledWith(expect.any(Object), bigId, expect.any(Date));

    const [, , passedDeviceId] = executeTransaction.mock.calls[0];
    expect(passedDeviceId).toBe(bigId);
    expect(typeof passedDeviceId).toBe('string');
  });

  test('15. success path logs position_handled with packet_size_bytes, event_count_emitted, transaction_duration_ms', async () => {
    detectOneShotEvents.mockReturnValue({
      events: [{ kind: 'alarm.sos' }, { kind: 'ignition.on' }],
      maintainedBitsSet: [],
    });
    const logger = makeLogger();
    const queryRunner = makeQueryRunner();
    const deps = makeDeps({ logger, queryRunner });
    const packetHex = 'a'.repeat(200); // 100 bytes

    await handle0x0200(packetHex, { deviceId: '42' }, deps);

    const successLogs = logger.info.mock.calls.filter(([key]) => key === 'position_handled');
    expect(successLogs).toHaveLength(1);
    const payload = successLogs[0][1];
    expect(payload.deviceId).toBe('42');
    expect(payload.packet_size_bytes).toBe(100);
    expect(payload.event_count_emitted).toBe(2);
    expect(payload.transaction_duration_ms).toBeGreaterThanOrEqual(0);
    expect(typeof payload.transaction_duration_ms).toBe('number');
    expect(payload).toHaveProperty('terminalId');
  });
});
