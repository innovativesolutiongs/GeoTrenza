const ONE_SHOT_ALARM_KINDS = {
  0: 'alarm.sos',
  7: 'alarm.low_power',
  8: 'alarm.power_off',
  9: 'ignition.on',
  10: 'ignition.off',
  11: 'alarm.power_on',
  12: 'alarm.leave_fortified_area',
  15: 'alarm.vibration',
  16: 'alarm.flip_fall',
  17: 'alarm.rapid_accel',
  20: 'alarm.bird_death',
  21: 'alarm.bird_takeoff',
  27: 'alarm.illegal_ignition',
  28: 'alarm.tow',
  30: 'alarm.harsh_braking',
  31: 'alarm.harsh_turn',
};

const MAINTAINED_ALARM_BITS = new Set([1, 2, 4, 5, 6, 14, 18, 19, 29]);

function detectOneShotEvents(alarmBits, positionId, recordedAt, deviceId) {
  const events = [];
  const maintainedBitsSet = [];

  for (let bit = 0; bit < 32; bit++) {
    if (((alarmBits >>> bit) & 1) === 0) continue;

    const kind = ONE_SHOT_ALARM_KINDS[bit];
    if (kind !== undefined) {
      events.push({
        device_id: deviceId,
        position_id: positionId,
        kind,
        payload: {},
        started_at: recordedAt,
        ended_at: recordedAt,
      });
    } else if (MAINTAINED_ALARM_BITS.has(bit)) {
      maintainedBitsSet.push(bit);
    }
  }

  return { events, maintainedBitsSet };
}

module.exports = detectOneShotEvents;
