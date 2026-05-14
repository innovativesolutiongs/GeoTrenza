const detectOneShotEvents = require('../../ingestion/utils/detectOneShotEvents');

describe('detectOneShotEvents', () => {
  const recordedAt = new Date('2026-05-14T10:00:00.000Z');
  const positionId = '123';
  const deviceId = '42';

  test('alarmBits = 0 → no events, no maintained bits', () => {
    const result = detectOneShotEvents(0, positionId, recordedAt, deviceId);
    expect(result.events).toEqual([]);
    expect(result.maintainedBitsSet).toEqual([]);
  });

  test('bit 0 SOS → one event with kind alarm.sos, no maintained bits', () => {
    const result = detectOneShotEvents(0x00000001, positionId, recordedAt, deviceId);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe('alarm.sos');
    expect(result.maintainedBitsSet).toEqual([]);
  });

  test('bit 1 overspeed (maintained) → no events, maintainedBitsSet: [1]', () => {
    const result = detectOneShotEvents(0x00000002, positionId, recordedAt, deviceId);
    expect(result.events).toEqual([]);
    expect(result.maintainedBitsSet).toEqual([1]);
  });

  test('bit 16 flip/fall → one event with kind alarm.flip_fall', () => {
    const result = detectOneShotEvents(0x00010000, positionId, recordedAt, deviceId);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe('alarm.flip_fall');
    expect(result.maintainedBitsSet).toEqual([]);
  });

  test('bit 31 harsh turn → one event with kind alarm.harsh_turn (sign-safe handling)', () => {
    const result = detectOneShotEvents(0x80000000, positionId, recordedAt, deviceId);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe('alarm.harsh_turn');
    expect(result.maintainedBitsSet).toEqual([]);
  });

  test('mixed bits 0/1/16: 2 one-shot events + 1 maintained bit', () => {
    const result = detectOneShotEvents(0x00010003, positionId, recordedAt, deviceId);
    expect(result.events).toHaveLength(2);
    expect(result.events.map((e) => e.kind)).toEqual(['alarm.sos', 'alarm.flip_fall']);
    expect(result.maintainedBitsSet).toEqual([1]);
  });

  test('bit 13 reserved → ignored entirely (no events, no maintained bits)', () => {
    const result = detectOneShotEvents(0x00002000, positionId, recordedAt, deviceId);
    expect(result.events).toEqual([]);
    expect(result.maintainedBitsSet).toEqual([]);
  });

  test('position_id and device_id pass through unchanged as bigint strings', () => {
    const bigPositionId = '9007199254740993';
    const bigDeviceId = '1234567890123';
    const result = detectOneShotEvents(0x00000001, bigPositionId, recordedAt, bigDeviceId);
    expect(result.events[0].position_id).toBe(bigPositionId);
    expect(result.events[0].device_id).toBe(bigDeviceId);
    expect(typeof result.events[0].position_id).toBe('string');
    expect(typeof result.events[0].device_id).toBe('string');
  });

  test('started_at === ended_at for one-shot events (same Date reference)', () => {
    const result = detectOneShotEvents(0x00000001, positionId, recordedAt, deviceId);
    expect(result.events[0].started_at).toBe(recordedAt);
    expect(result.events[0].ended_at).toBe(recordedAt);
    expect(result.events[0].started_at).toBe(result.events[0].ended_at);
  });

  test('payload is empty object {} for all events', () => {
    const result = detectOneShotEvents(0x00010003, positionId, recordedAt, deviceId);
    for (const event of result.events) {
      expect(event.payload).toEqual({});
    }
  });
});
