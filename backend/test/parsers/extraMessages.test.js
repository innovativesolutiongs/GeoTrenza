/**
 * Regression test for the secondary TLV-extras parser used by the 0x0200
 * location-report handler. Despite the name `parseExtraMessages`, this
 * parser runs over the same hex region as parseLocationExtra and produces
 * an overlapping but more permissive set of decoded fields. Both parsers
 * being called over the same bytes is one of the items the Stage 2
 * ingestion rewrite needs to reconcile.
 *
 * **ONE LOCKED BUG** — tracked as Bug 3 in STAGE_2_KNOWN_BUGS.md.
 * parseExtraMessages has the same offset-70 hardcoded-start as
 * parseLocationExtra (Bug 2). It's a separate entry in the bug list
 * because it's a separate code site that needs its own fix commit.
 *
 * Two tests below. The first uses a synthesized input to isolate the
 * correct TLV-decoding logic (offset matches assumption). The second
 * uses a real packet to lock the offset-70 *partial-garbage* output —
 * "partial" because byte-counting coincidences mean gsmSignal,
 * satellites, and batteryVoltage are recovered correctly despite the
 * bug, while mileage is lost. That partial-correctness is probably
 * why no one noticed the bug in production.
 *
 * Neither test blesses the bug — both lock the current baseline so the
 * fix commit can update the test alongside the parser change.
 */
const parseExtraMessages = require('../../ingestion/utils/extraMessageParser');

describe('parseExtraMessages (JT/T 808 0x0200 extended-TLV parser)', () => {
  test('synthetic TLV input — locks current field shapes', () => {
    // Synthesized hex: 70 chars of zero-filler + TLV records exercising
    // a representative set of the parser's known IDs (01, 02, 04, 30,
    // 31, 56, E1, E2, F9) plus one unknown (AA). The selection covers:
    //   - parseInt-with-divisor (mileage /10, batteryVoltage /10)
    //   - raw parseInt (fuel, gsmSignal, satellites, batteryPercent)
    //   - raw hex string preserved (batteryStatus, iccid)
    //   - F9-overwrites-56 quirk (both write batteryPercent; F9 wins)
    //   - default branch ("unknown_AA")
    const prefix = '0'.repeat(70);
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
     * | 70     | 01 | 04  | "000003E8"   | mileage           | parseInt/10 = 1000/10 = 100        |
     * | 82     | 02 | 02  | "0064"       | fuel              | parseInt = 100                     |
     * | 90     | 04 | 02  | "4F4B"       | batteryStatus     | raw hex "4F4B" (not parseInt)      |
     * | 98     | 30 | 01  | "14"         | gsmSignal         | parseInt = 20                      |
     * | 104    | 31 | 01  | "09"         | satellites        | parseInt = 9                       |
     * | 110    | 56 | 01  | "55"         | batteryPercent    | parseInt = 85 (overwritten by F9)  |
     * | 116    | E1 | 02  | "0078"       | batteryVoltage    | parseInt/10 = 120/10 = 12          |
     * | 124    | E2 | 05  | "12345ABCDE" | iccid             | raw hex "12345ABCDE" (not parseInt)|
     * | 138    | F9 | 01  | "5A"         | batteryPercent ⚠️ | parseInt = 90 (overwrites 85)      |
     * | 144    | AA | 02  | "BEEF"       | unknown_AA        | raw hex "BEEF"                     |
     * | 152    | —  | —   | —            | —                 | loop exits (152 < 148 false)       |
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

  test('Bug 3: deviceSimulator packet #3 — locks offset-70 partial-garbage output', () => {
    // Real JT/T 808 0x0200 packet from backend/ingestion/deviceSimulator.js.
    // Same offset-70 hardcoded-start bug as parseLocationExtra (locked
    // in locationExtra.test.js Bug 2; tracked here as Bug 3 because
    // it's a separate code site even though the root cause is identical).
    //
    // Crucially, parseExtraMessages' output on this packet is *partially*
    // correct by coincidence:
    //   - The 12-byte misread of the timestamp ("230619160840"...) eats
    //     exactly the same number of bytes as the real first TLV would
    //     (mileage, id=01, len=04, value=00000000 — 6 bytes = 12 hex
    //     chars).
    //   - So iterations after the misread happen to land on real TLV
    //     boundaries. gsmSignal, satellites, batteryVoltage are decoded
    //     CORRECTLY despite the bug.
    //   - Only mileage is lost (replaced by unknown_23) plus unknown_00
    //     appears as a parsing artifact of two zero-length default reads.
    //
    // This partial-correctness is likely why no one noticed the bug —
    // most of the data reaches the dashboard intact. The fix commit will
    // replace this with proper offset detection; the test then updates
    // to expect mileage=0 instead of the unknown_23/unknown_00 pair.
    const hex = '7E0200002C690106149138000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E';

    const result = parseExtraMessages(hex);

    /**
     * Expected-values derivation — iteration trace through the parser.
     * Iterations 4–6 read from offsets that coincidentally match real
     * TLV boundaries (94, 100, 106) — see the note above.
     *
     * | Offset | id   | len | Reads from real packet         | Stored as              |
     * |--------|------|-----|--------------------------------|------------------------|
     * | 70     | "23" | 06  | timestamp bytes "191608400104" | unknown_23             |
     * | 86     | "00" | 00  | (empty, length=0)              | unknown_00 = ""        |
     * | 90     | "00" | 00  | (empty, length=0, overwrites)  | unknown_00 = ""        |
     * | 94     | "30" | 01  | "19" (real gsmSignal TLV)      | gsmSignal = 25         |
     * | 100    | "31" | 01  | "16" (real satellites TLV)     | satellites = 22        |
     * | 106    | "E1" | 02  | "012A" (real batteryVoltage)   | batteryVoltage = 29.8  |
     * | 114    | —    | —   | loop exits (114 < 118-4 false)                          |
     *
     * The real mileage TLV at offset 82 (id=01, len=04, value=00000000)
     * is consumed inside the unknown_23 misread region and lost.
     */
    expect(result).toEqual({
      unknown_23: '191608400104',
      unknown_00: '',
      gsmSignal: 25,
      satellites: 22,
      batteryVoltage: 29.8,
    });
  });
});
