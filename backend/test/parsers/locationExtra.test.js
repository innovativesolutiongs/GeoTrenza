/**
 * Regression test for the JT/T 808 TLV-extras parser used by the 0x0200
 * location-report handler.
 *
 * **TWO LOCKED BUGS** — both tracked in STAGE_2_KNOWN_BUGS.md, scheduled
 * for separate fix commits later in Stage 2. The tests below lock current
 * behavior so the fixes are provably intentional, not silent drift.
 *
 * Bug 1 — Field-name mismatch (silent data drop).
 *   parseLocationExtra returns fields named `signalStrength`, `battery`,
 *   `speedExtra`. The writer in ingestion/index.js reads `gsmSignal`,
 *   `batteryVoltage`, `extendedSpeed`. The column names in the legacy
 *   schema match the WRITER's spelling, so these values silently land
 *   as NULL in the database even though the parser decoded them
 *   correctly. Locked by the "synthetic TLV input" test below.
 *
 * Bug 2 — Hardcoded TLV start at offset 70.
 *   parseLocationExtra begins TLV reading at hex offset 70. In a real
 *   JT/T 808 0x0200 packet, offset 70 is the start of the 6-byte BCD
 *   timestamp (YYMMDDHHMMSS); the actual TLVs begin at offset 82. So in
 *   production, parseLocationExtra interprets the timestamp bytes as
 *   TLV id+length pairs and emits a soup of "unknown_XX" keys. Locked
 *   by the "deviceSimulator packet #3" test below.
 *
 * Neither test blesses the bug — both lock the current baseline so the
 * fix commit can update the test alongside the parser change.
 */
const parseLocationExtra = require('../../ingestion/utils/locationExtraParser');

describe('parseLocationExtra (JT/T 808 0x0200 TLV-extras parser)', () => {
  test('Bug 1: synthetic TLV input — locks buggy field names', () => {
    // Synthesized hex: 70 chars of zero-filler + TLV records for IDs 01–06
    // plus one unknown ID 99. The zero-filler matches the parser's
    // offset-70 assumption, so this test isolates the field-name bug
    // from the offset-70 bug (which is locked in the next test).
    const prefix = '0'.repeat(70);
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
     * | Offset | ID | Len | ValueHex   | Field name (parser)    | Decoded                  |
     * |--------|----|-----|------------|------------------------|--------------------------|
     * | 70     | 01 | 04  | "00000064" | mileage                | parseInt/10 = 100/10 = 10|
     * | 82     | 02 | 02  | "0050"     | fuel                   | parseInt = 80            |
     * | 90     | 03 | 02  | "003C"     | speedExtra ⚠️          | parseInt = 60            |
     * | 98     | 04 | 01  | "1B"       | signalStrength ⚠️      | parseInt = 27            |
     * | 104    | 05 | 01  | "07"       | satellites             | parseInt = 7             |
     * | 110    | 06 | 02  | "0FA0"     | battery ⚠️             | parseInt = 4000          |
     * | 118    | 99 | 02  | "DEAD"     | unknown_99 (default)   | raw hex "DEAD"           |
     *
     * ⚠️ = field name does NOT match the writer in ingestion/index.js
     * (writer reads gsmSignal/extendedSpeed/batteryVoltage). Bug 1 in
     * STAGE_2_KNOWN_BUGS.md. Locked here as the current output.
     */
    expect(result).toEqual({
      mileage: 10,
      fuel: 80,
      speedExtra: 60,
      signalStrength: 27,
      satellites: 7,
      battery: 4000,
      unknown_99: 'DEAD',
    });
  });

  test('Bug 2: deviceSimulator packet #3 — locks offset-70 garbage output', () => {
    // Real JT/T 808 0x0200 packet from backend/ingestion/deviceSimulator.js.
    // In this packet, offset 70 is the 6-byte BCD timestamp "230619160840"
    // (2023-06-19 16:08:40); real TLVs start at offset 82. Because the
    // parser hardcodes offset 70, it eats the timestamp bytes as if they
    // were TLV id+length pairs. The output below is the resulting garbage
    // — five "unknown_XX" entries, no real telemetry recovered. The fix
    // commit (Bug 2 in STAGE_2_KNOWN_BUGS.md) will replace this with
    // proper offset detection; this test then updates to expect the
    // correctly-decoded fields.
    const hex = '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

    const result = parseLocationExtra(hex);

    /**
     * Expected-values derivation — iteration trace through the parser.
     *
     * | Offset | id   | len | Reads from real packet         | Stored as           |
     * |--------|------|-----|--------------------------------|---------------------|
     * | 70     | "23" | 06  | timestamp bytes "191608400104" | unknown_23          |
     * | 86     | "00" | 00  | (empty, length=0)              | unknown_00 = ""     |
     * | 90     | "00" | 00  | (empty, length=0, overwrites)  | unknown_00 = ""     |
     * | 94     | "30" | 01  | "19"                           | unknown_30 = "19"   |
     * | 100    | "31" | 01  | "16"                           | unknown_31 = "16"   |
     * | 106    | "E1" | 02  | "012A"                         | unknown_E1 = "012A" |
     * | 114    | —    | —   | loop exits (114 < 118-4 false)                       |
     *
     * Note: every key starts with "unknown_". Real packet TLVs at offset 82
     * (mileage, gsmSignal, satellites, etc.) are NEVER decoded because
     * the parser reads the wrong region of the packet.
     */
    expect(result).toEqual({
      unknown_23: '191608400104',
      unknown_00: '',
      unknown_30: '19',
      unknown_31: '16',
      unknown_E1: '012A',
    });
  });
});
