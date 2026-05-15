/**
 * Tests for the Phase B Step 4 packet-decoder. Confirms canonical-value
 * contract: signed lat/lon (from status bits 2/3), speed in km/h
 * (raw uint16 / 10), BCD timestamp -> UTC Date, raw alarm/status bits
 * preserved for downstream event detection.
 */
const parseLocationPacket = require('../../ingestion/utils/locationPacketParser');

// deviceSimulator.js packet #3. status = 0x00000003 -> bits 0+1 only
// (ACC on, positioned). Lat/lon positive. Speed raw = 0. BCD timestamp
// 230619160840 -> 2023-06-19 16:08:40 UTC.
const BASE_PACKET =
  '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

// Swap status word (offsets 34-42) for the sign/timestamp variants.
function withStatus(statusHex) {
  return BASE_PACKET.substring(0, 34) + statusHex + BASE_PACKET.substring(42);
}

// Swap speed word (offsets 62-66).
function withSpeed(speedHex) {
  return BASE_PACKET.substring(0, 62) + speedHex + BASE_PACKET.substring(66);
}

describe('parseLocationPacket (canonical 0x0200 decoder)', () => {
  test('decodes the full deviceSimulator example packet', () => {
    const result = parseLocationPacket(BASE_PACKET);

    expect(result).toEqual({
      terminalId: '690106149138',
      alarmBits: 256,
      statusBits: 3,
      latitude: 22.713375,
      longitude: 114.252022,
      altitude: 38,
      speed: 0,
      direction: 0,
      recordedAt: new Date('2023-06-19T16:08:40.000Z'),
      extras: {
        mileage: 0,
        gsmSignal: 25,
        satellites: 22,
        batteryVoltage: 29.8,
      },
    });
  });

  test('south-latitude status bit (bit 2) negates latitude', () => {
    // status = 0x00000007 -> bits 0,1,2 set (ACC, positioned, south lat).
    const result = parseLocationPacket(withStatus('00000007'));

    expect(result.statusBits).toBe(7);
    expect(result.latitude).toBe(-22.713375);
    expect(result.longitude).toBe(114.252022);
  });

  test('west-longitude status bit (bit 3) negates longitude', () => {
    // status = 0x0000000B -> bits 0,1,3 set (ACC, positioned, west lon).
    const result = parseLocationPacket(withStatus('0000000B'));

    expect(result.statusBits).toBe(11);
    expect(result.latitude).toBe(22.713375);
    expect(result.longitude).toBe(-114.252022);
  });

  test('raw speed 0x000A decodes to 1.0 km/h', () => {
    const result = parseLocationPacket(withSpeed('000A'));

    expect(result.speed).toBe(1);
  });

  test('BCD timestamp decodes to correct UTC Date', () => {
    const result = parseLocationPacket(BASE_PACKET);

    expect(result.recordedAt.toISOString()).toBe('2023-06-19T16:08:40.000Z');
  });

  test('throws on packets too short to contain the body header', () => {
    // 81 chars = one short of the 82 needed to read through the BCD
    // timestamp at offsets 70-82.
    const tooShort = BASE_PACKET.substring(0, 81);

    expect(() => parseLocationPacket(tooShort)).toThrow(/too short/);
  });
});
