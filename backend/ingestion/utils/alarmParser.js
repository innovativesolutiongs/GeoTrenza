function parseAlarm(alarmValue) {

  const alarms = [];

  if (alarmValue & (1 << 0)) alarms.push("Emergency Alarm (SOS)");
  if (alarmValue & (1 << 1)) alarms.push("Overspeed Alarm");
  if (alarmValue & (1 << 2)) alarms.push("Fatigue Driving");
  if (alarmValue & (1 << 3)) alarms.push("Danger Warning");

  if (alarmValue & (1 << 4)) alarms.push("GNSS Module Fault");
  if (alarmValue & (1 << 5)) alarms.push("GNSS Antenna Disconnected");
  if (alarmValue & (1 << 6)) alarms.push("GNSS Antenna Short Circuit");

  if (alarmValue & (1 << 7)) alarms.push("Main Power Undervoltage");
  if (alarmValue & (1 << 8)) alarms.push("Main Power Failure");

  if (alarmValue & (1 << 9)) alarms.push("LCD Failure");
  if (alarmValue & (1 << 10)) alarms.push("TTS Module Failure");
  if (alarmValue & (1 << 11)) alarms.push("Camera Failure");

  if (alarmValue & (1 << 12)) alarms.push("Road Transport Certificate IC Card Module Failure");

  if (alarmValue & (1 << 13)) alarms.push("Overspeed Warning");

  if (alarmValue & (1 << 14)) alarms.push("Fatigue Driving Warning");

  if (alarmValue & (1 << 15)) alarms.push("Illegal Ignition");

  if (alarmValue & (1 << 16)) alarms.push("Illegal Displacement");

  if (alarmValue & (1 << 17)) alarms.push("Rapid Acceleration");

  if (alarmValue & (1 << 18)) alarms.push("Rapid Deceleration");

  if (alarmValue & (1 << 19)) alarms.push("Sharp Turn");

  if (alarmValue & (1 << 20)) alarms.push("Cumulative Driving Overtime");

  if (alarmValue & (1 << 21)) alarms.push("Parking Overtime");

  if (alarmValue & (1 << 22)) alarms.push("Area Alarm");

  if (alarmValue & (1 << 23)) alarms.push("Route Alarm");

  if (alarmValue & (1 << 24)) alarms.push("Vehicle Theft");

  if (alarmValue & (1 << 25)) alarms.push("Vehicle Illegal Movement");

  if (alarmValue & (1 << 26)) alarms.push("Collision Alarm");

  if (alarmValue & (1 << 27)) alarms.push("Rollover Alarm");

  return alarms;

}

module.exports = parseAlarm;