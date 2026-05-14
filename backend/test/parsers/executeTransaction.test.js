const executeTransaction = require('../../ingestion/utils/executeTransaction');
const Position = require('../../ingestion/entities/Position');
const Event = require('../../ingestion/entities/Event');
const Device = require('../../ingestion/entities/Device');

function makeQueryRunner({ insertImpl, updateImpl } = {}) {
  const calls = [];
  const recordCall = (name) => (...args) => {
    calls.push({ name, args });
  };

  const insert = jest.fn(async (entity, data) => {
    calls.push({ name: 'insert', args: [entity, data] });
    if (insertImpl) return insertImpl(entity, data);
    return { identifiers: [{ id: '1' }] };
  });

  const update = jest.fn(async (entity, id, data) => {
    calls.push({ name: 'update', args: [entity, id, data] });
    if (updateImpl) return updateImpl(entity, id, data);
    return { affected: 1 };
  });

  const qr = {
    startTransaction: jest.fn(recordCall('startTransaction')),
    commitTransaction: jest.fn(recordCall('commitTransaction')),
    rollbackTransaction: jest.fn(recordCall('rollbackTransaction')),
    manager: { insert, update },
    calls,
  };
  return qr;
}

const basePositionData = {
  device_id: '42',
  recorded_at: new Date('2026-05-14T10:00:00.000Z'),
  received_at: new Date('2026-05-14T10:00:01.000Z'),
  lat: 24.7,
  lng: 46.6,
  speed_kph: 0,
  heading_deg: 0,
  altitude_m: 600,
  telemetry: { alarmBits: 0, statusBits: 0 },
};

describe('executeTransaction', () => {
  test('happy path with no events: start → insert(Position) → update(Device) → commit, no rollback', async () => {
    const qr = makeQueryRunner();

    await executeTransaction(basePositionData, [], '42', qr);

    const sequence = qr.calls.map((c) => c.name);
    expect(sequence).toEqual([
      'startTransaction',
      'insert',
      'update',
      'commitTransaction',
    ]);
    expect(qr.calls[1].args[0]).toBe(Position);
    expect(qr.calls[2].args[0]).toBe(Device);
    expect(qr.rollbackTransaction).not.toHaveBeenCalled();
  });

  test('happy path with events: events get position_id from Position insert, batched as one insert', async () => {
    const qr = makeQueryRunner({
      insertImpl: async (entity) => {
        if (entity === Position) return { identifiers: [{ id: '777' }] };
        return { identifiers: [{ id: '1' }, { id: '2' }] };
      },
    });

    const events = [
      { device_id: '42', kind: 'alarm.sos', payload: {}, started_at: new Date(), ended_at: new Date() },
      { device_id: '42', kind: 'alarm.flip_fall', payload: {}, started_at: new Date(), ended_at: new Date() },
    ];

    await executeTransaction(basePositionData, events, '42', qr);

    const sequence = qr.calls.map((c) => c.name);
    expect(sequence).toEqual([
      'startTransaction',
      'insert',
      'insert',
      'update',
      'commitTransaction',
    ]);

    const eventInsertCall = qr.calls[2];
    expect(eventInsertCall.args[0]).toBe(Event);
    const eventsInserted = eventInsertCall.args[1];
    expect(eventsInserted).toHaveLength(2);
    expect(eventsInserted[0].position_id).toBe('777');
    expect(eventsInserted[1].position_id).toBe('777');
    expect(eventsInserted[0].kind).toBe('alarm.sos');
    expect(eventsInserted[1].kind).toBe('alarm.flip_fall');
  });

  test('empty events array: events insert is skipped entirely', async () => {
    const qr = makeQueryRunner();

    await executeTransaction(basePositionData, [], '42', qr);

    expect(qr.manager.insert).toHaveBeenCalledTimes(1);
    expect(qr.manager.insert).toHaveBeenCalledWith(Position, basePositionData);
    expect(qr.manager.update).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
  });

  test('Position INSERT fails → rollback, no commit, error propagates', async () => {
    const boom = new Error('position insert failed');
    const qr = makeQueryRunner({
      insertImpl: async () => {
        throw boom;
      },
    });

    await expect(executeTransaction(basePositionData, [], '42', qr)).rejects.toBe(boom);
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
  });

  test('Events INSERT fails → rollback, no commit, error propagates', async () => {
    const boom = new Error('events insert failed');
    const qr = makeQueryRunner({
      insertImpl: async (entity) => {
        if (entity === Position) return { identifiers: [{ id: '777' }] };
        throw boom;
      },
    });

    const events = [
      { device_id: '42', kind: 'alarm.sos', payload: {}, started_at: new Date(), ended_at: new Date() },
    ];

    await expect(executeTransaction(basePositionData, events, '42', qr)).rejects.toBe(boom);
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
  });

  test('Device UPDATE fails → rollback, no commit, error propagates', async () => {
    const boom = new Error('device update failed');
    const qr = makeQueryRunner({
      updateImpl: async () => {
        throw boom;
      },
    });

    await expect(executeTransaction(basePositionData, [], '42', qr)).rejects.toBe(boom);
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
  });

  test('position_id is preserved as bigint string (no parseInt coercion)', async () => {
    const bigPositionId = '9007199254740993';
    const qr = makeQueryRunner({
      insertImpl: async (entity) => {
        if (entity === Position) return { identifiers: [{ id: bigPositionId }] };
        return { identifiers: [{ id: '1' }] };
      },
    });

    const events = [
      { device_id: '42', kind: 'alarm.sos', payload: {}, started_at: new Date(), ended_at: new Date() },
    ];

    await executeTransaction(basePositionData, events, '42', qr);

    const eventInsertCall = qr.calls.find((c, i) => i > 0 && c.name === 'insert');
    const allInsertCalls = qr.calls.filter((c) => c.name === 'insert');
    const eventsBatch = allInsertCalls[1].args[1];
    expect(eventsBatch[0].position_id).toBe(bigPositionId);
    expect(typeof eventsBatch[0].position_id).toBe('string');
  });

  test('devices.last_seen_at is set to positionData.received_at', async () => {
    const receivedAt = new Date('2026-05-14T12:34:56.000Z');
    const positionData = { ...basePositionData, received_at: receivedAt };
    const qr = makeQueryRunner();

    await executeTransaction(positionData, [], '42', qr);

    const updateCall = qr.calls.find((c) => c.name === 'update');
    expect(updateCall.args[0]).toBe(Device);
    expect(updateCall.args[1]).toBe('42');
    expect(updateCall.args[2]).toEqual({ last_seen_at: receivedAt });
    expect(updateCall.args[2].last_seen_at).toBe(receivedAt);
  });
});
