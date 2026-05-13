/**
 * Regression test for the secondary TLV-extras parser used by the 0x0200
 * location-report handler. Despite the name `parseExtraMessages`, this
 * parser runs over the same hex region as parseLocationExtra and produces
 * an overlapping but more permissive set of decoded fields. Both parsers
 * being called over the same bytes is one of the items the Stage 2
 * ingestion rewrite needs to reconcile (Bug 5 in STAGE_2_KNOWN_BUGS.md).
 *
 * **Bug 3 (offset-70 hardcoded start) is fixed.** The tests below now
 * verify post-fix behavior, not a locked bug.
 *
 * Asymmetry worth flagging: on deviceSimulator packet #3, post-fix
 * parseExtraMessages produces zero `unknown_*` entries because its
 * case list happens to cover every TLV ID the packet contains (01, 30,
 * 31, E1). Its sibling parseLocationExtra on the same packet produces
 * three `unknown_*` entries because its narrower case list (01-06)
 * doesn't recognize 30/31/E1. This is NOT because parseExtraMessages
 * has fewer bugs than parseLocationExtra — both parsers are subject to
 * the dual-parser overlap problem (Bug 5). The asymmetry just means
 * the overlap manifests less visibly for this parser on this specific
 * test packet. A future packet containing an ID parseExtraMessages
 * doesn't handle (e.g. a custom TLV from a different firmware) would
 * surface the same overlap as `unknown_*` entries here too.
 */
const parseExtraMessages = require('../../ingestion/utils/extraMessageParser');

describe('parseExtraMessages (JT/T 808 0x0200 extended-TLV parser)', () => {
  test('synthetic TLV input — verifies current field shapes', () => {
    // Synthesized hex: 82 chars of zero-filler + TLV records exercising
    // a representative set of the parser's known IDs (01, 02, 04, 30,
    // 31, 56, E1, E2, F9) plus one unknown (AA). The zero-filler
    // matches the parser's post-fix offset-82 assumption (after Bug 3
    // was fixed). The selection covers:
    //   - parseInt-with-divisor (mileage /10, batteryVoltage /10)
    //   - raw parseInt (fuel, gsmSignal, satellites, batteryPercent)
    //   - raw hex string preserved (batteryStatus, iccid)
    //   - F9-overwrites-56 quirk (both write batteryPercent; F9 wins)
    //   - default branch ("unknown_AA")
    const prefix = '0'.repeat(82);
    const tlv =
      '0104000003E8' +         // id=01, len=4, value=000003E8     → mileage=100
      '02020064' +             // id=02, len=2, value=0064         → fuel=100
      '04024F4B' +             // id=04, len=2, value=4F4B         → batteryStatus="4F4B" (raw)
      '300114' +               // id=30, len=1, value=14           → gsmSignal=20
      '310109' +               // id=31, len=1, value=09           → satellites=9
      '560155' +               // id=56, len=1, value=55           → batteryPercent=85 (later overwritten)
      'E1020078' +             // id=E1, len=2, value=0078         → batteryVoltage=12
      'E20512345ABCDE' +       // id=E2, len=5, value=12345ABCDE   → iccid="12345ABCDE" (raw)
      'F9015A' +               // id=F9, len=1, value=5A           → batteryPercent=90 (overwrites 85)
      'AA02BEEF';              // id=AA, len=2, value=BEEF         → unknown_AA="BEEF"
    const hex = prefix + tlv;

    const result = parseExtraMessages(hex);

    /**
     * Expected-values derivation — TLV-by-TLV, see extraMessageParser.js.
     *
     * | Offset | ID | Len | ValueHex     | Field name        | Decoded                            |
     * |--------|----|-----|--------------|-------------------|------------------------------------|
     * | 82     | 01 | 04  | "000003E8"   | mileage           | parseInt/10 = 1000/10 = 100        |
     * | 94     | 02 | 02  | "0064"       | fuel              | parseInt = 100                     |
     * | 102    | 04 | 02  | "4F4B"       | batteryStatus     | raw hex "4F4B" (not parseInt)      |
     * | 110    | 30 | 01  | "14"         | gsmSignal         | parseInt = 20                      |
     * | 116    | 31 | 01  | "09"         | satellites        | parseInt = 9                       |
     * | 122    | 56 | 01  | "55"         | batteryPercent    | parseInt = 85 (overwritten by F9)  |
     * | 128    | E1 | 02  | "0078"       | batteryVoltage    | parseInt/10 = 120/10 = 12          |
     * | 136    | E2 | 05  | "12345ABCDE" | iccid             | raw hex "12345ABCDE" (not parseInt)|
     * | 150    | F9 | 01  | "5A"         | batteryPercent ⚠️ | parseInt = 90 (overwrites 85)      |
     * | 156    | AA | 02  | "BEEF"       | unknown_AA        | raw hex "BEEF"                     |
     * | 164    | —  | —   | —            | —                 | loop exits (164 < 160 false)       |
     *
     * ⚠️ = F9 and 56 both write the same key `batteryPercent`. F9 runs
     * later in iteration order so its value (90) is what ends up in the
     * final object. This is current behavior, not necessarily intended;
     * the Stage 2 rewrite will consolidate the two write sites.
     */
    expect(result).toEqual({
      mileage: 100,
      fuel: 100,
      batteryStatus: '4F4B',
      gsmSignal: 20,
      satellites: 9,
      batteryPercent: 90,
      batteryVoltage: 12,
      iccid: '12345ABCDE',
      unknown_AA: 'BEEF',
    });
  });

  test('deviceSimulator packet #3 — verifies post-fix TLV decoding from offset 82', () => {
    // Real JT/T 808 0x0200 packet from backend/ingestion/deviceSimulator.js.
    // After the Bug 3 fix, the parser starts at offset 82 — skipping
    // the 6-byte BCD timestamp at offsets 70-81 — and correctly decodes
    // all four real TLVs in this packet (mileage, gsmSignal,
    // satellites, batteryVoltage). Pre-fix, mileage was lost (the
    // misread of the timestamp consumed those bytes as unknown_23) and
    // unknown_00 appeared as a parsing artifact; the other three values
    // happened to be decoded correctly by byte-counting coincidence.
    //
    // Post-fix, no `unknown_*` entries appear in this output — but see
    // the file-level docstring for why that's specific to this packet
    // and not a general property of the parser (Bug 5 is still active;
    // a different packet with TLV IDs outside this parser's case list
    // would still leak `unknown_*` through here too).
    const hex = '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

    const result = parseExtraMessages(hex);

    /**
     * Expected-values derivation — iteration trace through the parser,
     * starting at the post-fix offset 82.
     *
     * | Offset | id   | len | ValueHex   | Field name (parser) | Decoded                       |
     * |--------|------|-----|------------|---------------------|-------------------------------|
     * | 82     | "01" | 04  | "00000000" | mileage             | parseInt/10 = 0 / 10 = 0      |
     * | 94     | "30" | 01  | "19"       | gsmSignal           | parseInt = 25                 |
     * | 100    | "31" | 01  | "16"       | satellites          | parseInt = 22                 |
     * | 106    | "E1" | 02  | "012A"     | batteryVoltage      | parseInt/10 = 298 / 10 = 29.8 |
     * | 114    | —    | —   | —          | —                   | loop exits (114 < 114 false)  |
     */
    expect(result).toEqual({
      mileage: 0,
      gsmSignal: 25,
      satellites: 22,
      batteryVoltage: 29.8,
    });
  });

  test('TLV 0xFC IMEI — decodes 15 ASCII bytes into a digit string', () => {
    // TLV 0xFC was added in spec V1.41 (2023-06-20) for "LTE module's
    // imei". Format: 15 bytes, each byte is the ASCII code for one
    // decimal digit. The spec gives a worked example:
    //   bytes 38 36 36 36 35 31 30 36 37 31 39 37 37 36 37
    //   → string "866651067197767"
    // We use the spec's own example as the test fixture so anyone
    // cross-checking can match the assertion to the PDF directly.
    // See docs/protocols/mobicom-jt808-v2.2.pdf (Table 5-10) line 899
    // of the extracted text mirror.
    //
    // No device list in the spec; per the spec audit (Q5 of yesterday's
    // verification report) this is universal across LTE-capable trackers,
    // including G107. Yesterday's parser-gap audit had this as an
    // UNHANDLED G107-relevant TLV; this test locks in the new HANDLED
    // status. Writer-side persistence (devices.imei vs positions.telemetry)
    // is a Stage 2 Phase B decision — this commit only adds the parser case.
    const prefix = '0'.repeat(82);
    const tlv = 'FC0F383636363531303637313937373637';
    const hex = prefix + tlv;

    const result = parseExtraMessages(hex);

    /**
     * Expected-values derivation — single-TLV iteration trace.
     *
     * | Offset | id   | len | ValueHex                         | Field name | Decoded                                       |
     * |--------|------|-----|----------------------------------|------------|-----------------------------------------------|
     * | 82     | "FC" | 0F  | "383636363531303637313937373637" | imei       | Buffer.from(...,'hex').toString('ascii')      |
     * |        |      |     |                                  |            | = "866651067197767" (per spec V1.41 example)  |
     * | 116    | —    | —   | —                                | —          | loop exits (116 < 116 false)                  |
     */
    expect(result).toEqual({
      imei: '866651067197767',
    });
  });
});
