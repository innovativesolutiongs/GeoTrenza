/**
 * Regression test for the JT/T 808 TLV-extras parser used by the 0x0200
 * location-report handler.
 *
 * **Bug 1 (field-name mismatch) and Bug 2 (offset-70 hardcoded start)
 * are both fixed.** The tests below now verify post-fix behavior, not
 * locked bugs.
 *
 * Note: the packet #3 test still shows `unknown_30`/`unknown_31`/
 * `unknown_E1` keys. These are real TLVs (gsmSignal/satellites/
 * batteryVoltage) that belong to parseExtraMessages' decode set, not
 * parseLocationExtra's. This is the dual-parser overlap problem
 * (Bug 5 in STAGE_2_KNOWN_BUGS.md), not a bug in this parser. The
 * Bug 5 fix will consolidate both parsers so all real TLVs reach the
 * writer regardless of which parser owns the ID.
 */
const parseLocationExtra = require('../../ingestion/utils/locationExtraParser');

describe('parseLocationExtra (JT/T 808 0x0200 TLV-extras parser)', () => {
  test('synthetic TLV input — verifies field names match writer reads', () => {
    // Synthesized hex: 82 chars of zero-filler + TLV records for IDs 01–06
    // plus one unknown ID 99. The zero-filler matches the parser's
    // post-fix offset-82 assumption (after Bug 2 was fixed). This test
    // exercises pure TLV decoding against a clean input — the packet #3
    // test below exercises real-packet decoding.
    const prefix = '0'.repeat(82);
    const tlv =
      '01040000006402020050' +  // mileage=10, fuel=80
      '0302003C04011B' +        // speedExtra=60, signalStrength=27
      '05010706020FA0' +        // satellites=7, battery=4000
      '9902DEAD';               // unknown_99="DEAD"
    const hex = prefix + tlv;

    const result = parseLocationExtra(hex);

    /**
     * Expected-values derivation — TLV-by-TLV, see locationExtraParser.js.
     * Each TLV is: 1-byte ID + 1-byte length + length-bytes of value.
     *
     * | Offset | ID | Len | ValueHex   | Field name (parser)  | Decoded                  |
     * |--------|----|-----|------------|----------------------|--------------------------|
     * | 82     | 01 | 04  | "00000064" | mileage              | parseInt/10 = 100/10 = 10|
     * | 94     | 02 | 02  | "0050"     | fuel                 | parseInt = 80            |
     * | 102    | 03 | 02  | "003C"     | extendedSpeed        | parseInt = 60            |
     * | 110    | 04 | 01  | "1B"       | gsmSignal            | parseInt = 27            |
     * | 116    | 05 | 01  | "07"       | satellites           | parseInt = 7             |
     * | 122    | 06 | 02  | "0FA0"     | batteryVoltage       | parseInt = 4000          |
     * | 130    | 99 | 02  | "DEAD"     | unknown_99 (default) | raw hex "DEAD"           |
     * | 138    | —  | —   | —          | —                    | loop exits (138 < 134 false) |
     *
     * Field names match the writer's reads in ingestion/index.js after the
     * Bug 1 fix. Previously these were `speedExtra`/`signalStrength`/
     * `battery`, which the writer didn't read — silent NULL columns in
     * `gps_extra_location_legacy`. See STAGE_2_KNOWN_BUGS.md.
     */
    expect(result).toEqual({
      mileage: 10,
      fuel: 80,
      extendedSpeed: 60,
      gsmSignal: 27,
      satellites: 7,
      batteryVoltage: 4000,
      unknown_99: 'DEAD',
    });
  });

  test('deviceSimulator packet #3 — verifies post-fix TLV decoding from offset 82', () => {
    // Real JT/T 808 0x0200 packet from backend/ingestion/deviceSimulator.js.
    // After the Bug 2 fix, the parser starts at offset 82 — skipping
    // the 6-byte BCD timestamp at offsets 70–81 — and correctly decodes
    // the first real TLV (mileage). Three subsequent TLVs in this packet
    // (IDs 30, 31, E1) are valid JT/T 808 TLVs but parseLocationExtra
    // does not recognize them; they fall through to the default branch
    // as unknown_*. parseExtraMessages, which runs over the same hex
    // region, does recognize these IDs — that's the Bug 5 (dual-parser
    // overlap) problem the writer needs to consolidate.
    const hex = '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

    const result = parseLocationExtra(hex);

    /**
     * Expected-values derivation — iteration trace through the parser,
     * starting at the post-fix offset 82.
     *
     * | Offset | id   | len | ValueHex   | Field name (parser)  | Decoded                      |
     * |--------|------|-----|------------|----------------------|------------------------------|
     * | 82     | "01" | 04  | "00000000" | mileage              | parseInt/10 = 0 / 10 = 0     |
     * | 94     | "30" | 01  | "19"       | unknown_30 (default) | raw hex "19"  (Bug 5)        |
     * | 100    | "31" | 01  | "16"       | unknown_31 (default) | raw hex "16"  (Bug 5)        |
     * | 106    | "E1" | 02  | "012A"     | unknown_E1 (default) | raw hex "012A" (Bug 5)       |
     * | 114    | —    | —   | —          | —                    | loop exits (114 < 114 false) |
     *
     * The three `unknown_*` entries map to real telemetry that
     * parseExtraMessages handles (gsmSignal=25, satellites=22,
     * batteryVoltage=29.8 respectively). The writer in
     * ingestion/index.js currently reads from `extras` (this parser's
     * output) for those fields and so gets `undefined` — see Bug 5 in
     * STAGE_2_KNOWN_BUGS.md.
     */
    expect(result).toEqual({
      mileage: 0,
      unknown_30: '19',
      unknown_31: '16',
      unknown_E1: '012A',
    });
  });
});
