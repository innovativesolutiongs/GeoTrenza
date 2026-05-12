/**
 * Regression test for the JT/T 808 status-bit parser.
 * Locks the parser's current behavior — including a known design choice
 * (see STAGE_2_KNOWN_BUGS.md): when a status bit has both "on" and "off"
 * label branches (bits 0–4 and 6), parseStatus emits a label every call
 * regardless of whether the underlying flag changed. The 0x0200 handler
 * in index.js writes one row to gps_status per emitted label, which means
 * the events table records "ACC OFF" / "GPS Not Fixed" / "Door Closed"
 * as if they were transitions. The Stage 2 ingestion rewrite replaces
 * this with proper transition tracking — this test captures the current
 * baseline so the rewrite is provably intentional.
 */
const parseStatus = require('../../ingestion/utils/statusParser');

describe('parseStatus (JT/T 808 status-bit decoder)', () => {
  test('decodes status value 3 (the actual value from deviceSimulator.js packet #3)', () => {
    // statusValue = 3 = binary 0b011, i.e. bit 0 and bit 1 set.
    // This is the integer parseGPS extracts from packet #3's status field —
    // tests are intentionally cross-linked so a packet-format change shows
    // up in both gpsData.test.js and this file.
    const result = parseStatus(3);

    /**
     * Expected-values derivation — bit-by-bit, see statusParser.js for source.
     *
     * | Bit | Condition (val & 1<<n) | Set?         | Label pushed       |
     * |-----|------------------------|--------------|--------------------|
     * | 0   | 3 & 1   = 1            | on           | "ACC ON"           |
     * | 1   | 3 & 2   = 2            | on           | "GPS Fixed"        |
     * | 2   | 3 & 4   = 0            | off (else)   | "Latitude North"   |
     * | 3   | 3 & 8   = 0            | off (else)   | "Longitude East"   |
     * | 4   | 3 & 16  = 0            | off (else)   | "Vehicle Stopped"  |
     * | 5   | 3 & 32  = 0            | off, no else | (nothing pushed)   |
     * | 6   | 3 & 64  = 0            | off (else)   | "Door Closed"      |
     * | 7   | 3 & 128 = 0            | off, no else | (nothing pushed)   |
     * | 8+  | all 0                  | off, no else | (nothing pushed)   |
     */
    expect(result).toEqual([
      'ACC ON',
      'GPS Fixed',
      'Latitude North',
      'Longitude East',
      'Vehicle Stopped',
      'Door Closed',
    ]);
  });
});
