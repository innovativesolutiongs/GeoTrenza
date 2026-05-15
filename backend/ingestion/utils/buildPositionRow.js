const EXCLUDED_FROM_TELEMETRY = new Set([
  'mileage',
  'gsmSignal',
  'satellites',
  'batteryVoltage',
]);

function buildPositionRow(packetData, deviceId, receivedAt) {
  const { extras } = packetData;

  const row = {
    device_id: deviceId,
    recorded_at: packetData.recordedAt,
    received_at: receivedAt,
    lat: packetData.latitude,
    lng: packetData.longitude,
    speed_kph: packetData.speed,
    heading_deg: packetData.direction,
    altitude_m: packetData.altitude,
  };

  if (extras.satellites !== undefined) row.satellites = extras.satellites;
  if (extras.gsmSignal !== undefined) row.signal_strength = extras.gsmSignal;
  if (extras.batteryVoltage !== undefined) row.battery_voltage = extras.batteryVoltage;
  if (extras.mileage !== undefined) row.mileage_m = extras.mileage * 1000;

  const telemetry = {
    alarmBits: packetData.alarmBits,
    statusBits: packetData.statusBits,
  };
  for (const [key, value] of Object.entries(extras)) {
    if (!EXCLUDED_FROM_TELEMETRY.has(key)) {
      telemetry[key] = value;
    }
  }
  row.telemetry = telemetry;

  return row;
}

module.exports = buildPositionRow;
