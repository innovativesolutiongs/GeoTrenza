/**
 * Regression test for the JT/T 808 0x0200 location-report parser.
 * Input is packet #3 from backend/ingestion/deviceSimulator.js — the same
 * hex the legacy ingestion has been tested against. Locks the parser's
 * current behavior so the Stage 2 rewrite can be checked for byte-level
 * compatibility before changing any field shapes.
 */
const parseGPS = require('../../ingestion/utils/gpsParser');

describe('parseGPS (JT/T 808 0x0200 location-report parser)', () => {
  test('decodes the deviceSimulator example packet', () => {
    // From backend/ingestion/deviceSimulator.js, packet #3 (GPS / 0x0200).
    // The lat/lng decode to ~22.71°N, 114.25°E — Shenzhen, China. Almost
    // certainly Mobicom/G107 manufacturer test coordinates baked into the
    // simulator. We test against the parser's actual output, not against
    // a hypothetical "intended" location.
    const hex = '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

    const result = parseGPS(hex);

    /**
     * Expected-values derivation — verify without re-running the parser.
     * Each row is the substring extracted by gpsParser.js, decoded as
     * parseInt(_, 16), then (for lat/lng) divided by 1,000,000.
     *
     * | Field      | Hex substring (idx range)    | Decoded                                       |
     * |------------|------------------------------|-----------------------------------------------|
     * | terminalId | chars 10–22 = "690106149138" | string, matches deviceSimulator's TERMINAL_ID |
     * | alarm      | chars 26–34 = "00000100"     | parseInt(_, 16) = 256                         |
     * | status     | chars 34–42 = "00000003"     | parseInt(_, 16) = 3                           |
     * | latitude   | chars 42–50 = "015A941F"     | parseInt = 22713375; ÷ 1e6 = 22.713375        |
     * | longitude  | chars 50–58 = "06CF58F6"     | parseInt = 114252022; ÷ 1e6 = 114.252022      |
     * | altitude   | chars 58–62 = "0026"         | parseInt(_, 16) = 38                          |
     * | speed      | chars 62–66 = "0000"         | parseInt(_, 16) = 0                           |
     * | direction  | chars 66–70 = "0000"         | parseInt(_, 16) = 0                           |
     */
    expect(result).toEqual({
      terminalId: '690106149138',
      alarm: 256,
      status: 3,
      latitude: 22.713375,
      longitude: 114.252022,
      altitude: 38,
      speed: 0,
      direction: 0,
    });
  });
});
