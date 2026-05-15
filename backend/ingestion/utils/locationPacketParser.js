const parseGPS = require('./gpsParser');
const parseExtraMessages = require('./extraMessageParser');

const STATUS_BIT_SOUTH_LAT = 0x04;
const STATUS_BIT_WEST_LON = 0x08;

const BODY_HEADER_END = 82;

function decodeBCDTimestamp(hex) {
  const yy = parseInt(hex.substring(0, 2), 10);
  const mm = parseInt(hex.substring(2, 4), 10);
  const dd = parseInt(hex.substring(4, 6), 10);
  const hh = parseInt(hex.substring(6, 8), 10);
  const mi = parseInt(hex.substring(8, 10), 10);
  const ss = parseInt(hex.substring(10, 12), 10);
  return new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, mi, ss));
}

function parseLocationPacket(hex) {
  if (typeof hex !== 'string' || hex.length < BODY_HEADER_END) {
    throw new Error(
      `parseLocationPacket: packet too short (${hex?.length ?? 0} hex chars, need >= ${BODY_HEADER_END})`
    );
  }

  const base = parseGPS(hex);
  const recordedAt = decodeBCDTimestamp(hex.substring(70, 82));
  const extras = parseExtraMessages(hex);

  const southLat = (base.status & STATUS_BIT_SOUTH_LAT) !== 0;
  const westLon = (base.status & STATUS_BIT_WEST_LON) !== 0;

  return {
    terminalId: base.terminalId,
    alarmBits: base.alarm,
    statusBits: base.status,
    latitude: southLat ? -base.latitude : base.latitude,
    longitude: westLon ? -base.longitude : base.longitude,
    altitude: base.altitude,
    speed: base.speed / 10,
    direction: base.direction,
    recordedAt,
    extras,
  };
}

module.exports = parseLocationPacket;
