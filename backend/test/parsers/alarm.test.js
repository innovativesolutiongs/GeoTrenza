/**
 * Regression test for the JT/T 808 alarm-bit parser.
 * Unlike parseStatus, parseAlarm has no "else" branches — it only pushes
 * a label when a bit is actually set. Output is one entry per active
 * alarm. The Stage 2 rewrite preserves this shape; this test locks the
 * exact label strings so spelling/wording can't drift silently.
 */
const parseAlarm = require('../../ingestion/utils/alarmParser');

describe('parseAlarm (JT/T 808 alarm-bit decoder)', () => {
  test('decodes alarm value 256 (the actual value from deviceSimulator.js packet #3)', () => {
    // alarmValue = 256 = binary 0b1_0000_0000, i.e. only bit 8 set.
    // This is the integer parseGPS extracts from packet #3's alarm field —
    // intentionally cross-linked with gpsData.test.js and status.test.js.
    const result = parseAlarm(256);

    /**
     * Expected-values derivation — bit-by-bit, see alarmParser.js for source.
     *
     * | Bit | Condition (val & 1<<n) | Set? | Label pushed         |
     * |-----|------------------------|------|----------------------|
     * | 0–7 | 256 & 1..128 all = 0   | off  | (nothing pushed)     |
     * | 8   | 256 & 256 = 256        | on   | "Main Power Failure" |
     * | 9+  | 256 & 512+ all = 0     | off  | (nothing pushed)     |
     *
     * parseAlarm.js defines 28 alarm bits (0–27). Only bit 8 is asserted
     * by this input. The other 27 conditions all fall through silently.
     */
    expect(result).toEqual(['Main Power Failure']);
  });
});
