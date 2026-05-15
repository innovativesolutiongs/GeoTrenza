const buildPositionRow = require('../../ingestion/utils/buildPositionRow');

describe('buildPositionRow', () => {
  test('full happy path: typed extras land in typed columns, not duplicated into telemetry', () => {
    const recordedAt = new Date('2026-05-14T10:00:00.000Z');
    const receivedAt = new Date('2026-05-14T10:00:01.000Z');
    const packetData = {
      recordedAt,
      latitude: 24.7136,
      longitude: 46.6753,
      speed: 65,
      direction: 180,
      altitude: 612,
      alarmBits: 0x00000001,
      statusBits: 0x00000002,
      extras: {
        satellites: 12,
        gsmSignal: 28,
        batteryVoltage: 13.7,
        mileage: 12.5,
      },
    };

    const row = buildPositionRow(packetData, '42', receivedAt);

    expect(row).toEqual({
      device_id: '42',
      recorded_at: recordedAt,
      received_at: receivedAt,
      lat: 24.7136,
      lng: 46.6753,
      speed_kph: 65,
      heading_deg: 180,
      altitude_m: 612,
      satellites: 12,
      signal_strength: 28,
      battery_voltage: 13.7,
      mileage_m: 12500,
      telemetry: {
        alarmBits: 0x00000001,
        statusBits: 0x00000002,
      },
    });
  });

  test('empty extras: typed extra columns absent (not undefined-valued), telemetry has only alarm/status', () => {
    const recordedAt = new Date('2026-05-14T10:00:00.000Z');
    const receivedAt = new Date('2026-05-14T10:00:01.000Z');
    const packetData = {
      recordedAt,
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: {},
    };

    const row = buildPositionRow(packetData, '42', receivedAt);

    const keys = Object.keys(row);
    expect(keys).not.toContain('satellites');
    expect(keys).not.toContain('signal_strength');
    expect(keys).not.toContain('battery_voltage');
    expect(keys).not.toContain('mileage_m');
    expect(row.telemetry).toEqual({ alarmBits: 0, statusBits: 0 });
  });

  test('mileage km → m conversion: extras.mileage = 12.5 → row.mileage_m === 12500', () => {
    const packetData = {
      recordedAt: new Date('2026-05-14T10:00:00.000Z'),
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: { mileage: 12.5 },
    };

    const row = buildPositionRow(packetData, '42', new Date());

    expect(row.mileage_m).toBe(12500);
  });

  test('device_id passed through unchanged: bigint string beyond Number.MAX_SAFE_INTEGER', () => {
    const bigintDeviceId = '9007199254740993';
    const packetData = {
      recordedAt: new Date('2026-05-14T10:00:00.000Z'),
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: {},
    };

    const row = buildPositionRow(packetData, bigintDeviceId, new Date());

    expect(row.device_id).toBe(bigintDeviceId);
    expect(typeof row.device_id).toBe('string');
  });

  test('received_at and recorded_at preserved as distinct Date objects', () => {
    const recordedAt = new Date('2026-05-14T10:00:00.000Z');
    const receivedAt = new Date('2026-05-14T10:00:05.000Z');
    const packetData = {
      recordedAt,
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: {},
    };

    const row = buildPositionRow(packetData, '42', receivedAt);

    expect(row.recorded_at).toBe(recordedAt);
    expect(row.received_at).toBe(receivedAt);
    expect(row.recorded_at).not.toBe(row.received_at);
  });

  test('unknown TLVs flow into telemetry', () => {
    const packetData = {
      recordedAt: new Date('2026-05-14T10:00:00.000Z'),
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: { unknown_AB: '01020304' },
    };

    const row = buildPositionRow(packetData, '42', new Date());

    expect(row.telemetry.unknown_AB).toBe('01020304');
  });

  test('alarmBits=0 and statusBits=0 still appear in telemetry (not filtered on falsy)', () => {
    const packetData = {
      recordedAt: new Date('2026-05-14T10:00:00.000Z'),
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: {},
    };

    const row = buildPositionRow(packetData, '42', new Date());

    expect(row.telemetry).toHaveProperty('alarmBits', 0);
    expect(row.telemetry).toHaveProperty('statusBits', 0);
  });

  test('sweep-all-non-typed contract: parser-emitted TLVs not in EXCLUDED set land in telemetry', () => {
    const packetData = {
      recordedAt: new Date('2026-05-14T10:00:00.000Z'),
      latitude: 24.7,
      longitude: 46.6,
      speed: 0,
      direction: 0,
      altitude: 600,
      alarmBits: 0,
      statusBits: 0,
      extras: {
        fuelAnalog: 42,
        rotation: 800,
        loadWeight: 15.0,
      },
    };

    const row = buildPositionRow(packetData, '42', new Date());

    expect(row.telemetry.fuelAnalog).toBe(42);
    expect(row.telemetry.rotation).toBe(800);
    expect(row.telemetry.loadWeight).toBe(15.0);
  });
});
