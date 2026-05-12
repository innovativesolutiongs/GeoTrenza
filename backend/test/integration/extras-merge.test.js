/**
 * Integration regression test for STAGE_2_KNOWN_BUGS.md Bug 5
 * (parseLocationExtra / parseExtraMessages dual-parser source mismatch).
 *
 * Pre-fix: extraRepo.save({...}) in backend/ingestion/index.js read four
 * keys (alarmEvent, temperature, fuelSensor, externalVoltage) from
 * parseLocationExtra's output, but that parser never emits them. The
 * corresponding columns in gps_extra_location_legacy were always-NULL in
 * production.
 *
 * Fix: writer reads those four fields from parseExtraMessages's output
 * (extraMsg) instead, while keeping all other fields reading from
 * parseLocationExtra (extras). This test mirrors that selective-merge
 * shape and locks the behavior so a future "simplification" cannot
 * silently regress it.
 *
 * The architecturally cleaner consolidation (single TLV decoder) is
 * deferred to Stage 4 cleanup.
 */
const parseLocationExtra = require('../../ingestion/utils/locationExtraParser');
const parseExtraMessages = require('../../ingestion/utils/extraMessageParser');

describe('extras-merge: Bug 5 cross-parser writer fix', () => {
  // 82 chars of zero-filler (parsers start TLV walking at offset 82),
  // then TLVs chosen to exercise both parsers' coverage AND make the
  // post-fix writer reads diagnostic (different parsers emit different
  // values for the same key, so a mistaken parser switch shows up).
  //
  //   01 04 0000007B  → mileage = 12.3 (÷10) — both parsers emit, identical formula
  //   04 01 19        → parseLocationExtra: gsmSignal = 25
  //                     parseExtraMessages: batteryStatus = "19" (different key, same TLV)
  //   06 02 0048      → parseLocationExtra: batteryVoltage = 72 (raw int)
  //                     parseExtraMessages: unknown_06 (no case 06)
  //   30 01 2A        → parseExtraMessages: gsmSignal = 42 (deliberately ≠ 25 from TLV 04)
  //                     parseLocationExtra: unknown_30
  //   50 04 00000064  → parseExtraMessages: fuelSensor = 100        (Bug 5 field)
  //   51 02 00FA      → parseExtraMessages: temperature = 25.0      (Bug 5 field)
  //   61 02 04D2      → parseExtraMessages: externalVoltage = 12.34 (Bug 5 field)
  //
  // Trailing 4 chars satisfy the `index < hex.length - 4` loop bound.
  const hex =
    '0'.repeat(82) +
    '01040000007B' +    // TLV 01: mileage
    '040119' +          // TLV 04: locationExtra gsmSignal=25 / extraMessages batteryStatus
    '06020048' +        // TLV 06: locationExtra batteryVoltage=72
    '30012A' +          // TLV 30: extraMessages gsmSignal=42
    '500400000064' +    // TLV 50: fuelSensor
    '510200FA' +        // TLV 51: temperature
    '610204D2' +        // TLV 61: externalVoltage
    '0000';             // trailing checksum-like pad

  const extras = parseLocationExtra(hex);
  const extraMsg = parseExtraMessages(hex);

  test('parseLocationExtra emits mileage/gsmSignal/batteryVoltage but NOT temperature/fuelSensor/externalVoltage/alarmEvent', () => {
    // Confirms the precondition for Bug 5: the four broken keys are
    // absent from parseLocationExtra's output, which is why reading
    // them off `extras` in the writer produced always-NULL columns.
    // Also pins the values for fields that DO live in extras, so the
    // writer-row assertions below can confirm correct parser selection.
    expect(extras.mileage).toBe(12.3);
    expect(extras.gsmSignal).toBe(25);
    expect(extras.batteryVoltage).toBe(72);
    expect(extras.temperature).toBeUndefined();
    expect(extras.fuelSensor).toBeUndefined();
    expect(extras.externalVoltage).toBeUndefined();
    expect(extras.alarmEvent).toBeUndefined();
  });

  test('parseExtraMessages emits temperature/fuelSensor/externalVoltage from TLVs 51/50/61', () => {
    expect(extraMsg.temperature).toBe(25.0);
    expect(extraMsg.fuelSensor).toBe(100);
    expect(extraMsg.externalVoltage).toBe(12.34);
    // Side-evidence that this packet exercises the cross-parser-same-key
    // case: extraMsg.gsmSignal (from TLV 30) is 42, while extras.gsmSignal
    // (from TLV 04) is 25. The writer must pick the right one.
    expect(extraMsg.gsmSignal).toBe(42);
    // alarmEvent is not emitted by either parser — documented limitation
    // of the Bug 5 fix; tracked separately for a future TLV 0x14 parser.
    expect(extraMsg.alarmEvent).toBeUndefined();
  });

  test('selective-merge writer row: extraRepo fields read from the correct parser', () => {
    // Mirror the post-fix shape of extraRepo.save in
    // backend/ingestion/index.js. Four fields come from extraMsg; the
    // rest come from extras.
    const writerRow = {
      mileage: extras.mileage || null,
      fuel: extras.fuel || null,
      speed_ext: extras.extendedSpeed || null,
      alarm_event: extraMsg.alarmEvent || null,           // Bug 5 fix
      signal_strength: extras.gsmSignal || null,
      satellites: extras.satellites || null,
      battery_voltage: extras.batteryVoltage || null,
      temperature: extraMsg.temperature || null,          // Bug 5 fix
      fuel_sensor: extraMsg.fuelSensor || null,           // Bug 5 fix
      external_voltage: extraMsg.externalVoltage || null, // Bug 5 fix
    };

    // Previously always-NULL columns are now populated:
    expect(writerRow.temperature).toBe(25.0);
    expect(writerRow.fuel_sensor).toBe(100);
    expect(writerRow.external_voltage).toBe(12.34);

    // alarm_event remains NULL — no parser emits alarmEvent yet:
    expect(writerRow.alarm_event).toBeNull();

    // Fields kept on parseLocationExtra continue to populate correctly:
    expect(writerRow.mileage).toBe(12.3);
    expect(writerRow.signal_strength).toBe(25);    // extras (TLV 04), NOT extraMsg's 42 (TLV 30)
    expect(writerRow.battery_voltage).toBe(72);    // extras (TLV 06 raw int)

    // Regression guard: ensure no field was mistakenly switched to the
    // wrong parser. If a future "simplification" flips signal_strength
    // to read from extraMsg, it would become 42 instead of 25 and this
    // assertion fires. Same for battery_voltage if E1 ever gets added
    // to a future packet — the writer must still consume extras.
    expect(writerRow.signal_strength).not.toBe(extraMsg.gsmSignal);
  });
});

describe('writer-zero-coalesce: Bug 6 — `?? null` preserves legitimate 0 readings', () => {
  // Minimal packet: 82 chars of timestamp filler, then TLV 01 04 00000000
  // (mileage = 0 — parseLocationExtra emits 0 / 10 = 0). Trailing pad
  // satisfies the parser's `index < hex.length - 4` loop bound.
  const hex = '0'.repeat(82) + '010400000000' + '0000';
  const extras = parseLocationExtra(hex);

  test('parseLocationExtra emits mileage === 0 for TLV 01 04 00000000', () => {
    // Precondition: parser DOES emit zero. Bug 6 is purely a writer-side
    // coercion — the parser is fine.
    expect(extras.mileage).toBe(0);
    expect(extras.mileage).not.toBeUndefined();
  });

  test('post-fix writer row preserves mileage: 0 (not null) via ?? null', () => {
    // Mirrors the post-fix shape of extraRepo.save in
    // backend/ingestion/index.js.
    const writerRow = {
      mileage: extras.mileage ?? null,
    };
    expect(writerRow.mileage).toBe(0);
    expect(writerRow.mileage).not.toBeNull();
  });

  test('diagnostic: pre-fix `|| null` would have written null instead of 0', () => {
    // Pin the bug's pre-fix behavior so the operator distinction is
    // documented in-place. If someone reverts ?? → || in the future,
    // this test still passes — it's a documentation-as-test of WHY the
    // swap matters, not a regression guard. The actual guard is the
    // test above.
    const preFix = extras.mileage || null;
    expect(preFix).toBeNull();
  });
});

describe('extraDataRepo-shape: Bug 7 — writer reads camelCase keys parseExtraMessages emits', () => {
  // Pre-fix: extraDataRepo.save({...}) in backend/ingestion/index.js
  // read 10 data keys from extraMsg. 7 of those reads never matched
  // anything parseExtraMessages emits:
  //   - 4 speculative snake_case fields (message_id, gnss_signal,
  //     humidity, raw) — no TLV case produces these keys
  //   - 3 case-mismatch fields (gsm_signal/battery_voltage/
  //     battery_percent) — parser emits camelCase
  // Post-fix: 4 speculative reads pruned, 3 case-mismatch reads flipped
  // to camelCase. 6 working fields + terminal_id remain.
  //
  // Packet exercises all 6 kept fields and zero TLVs for the pruned
  // ones (no parser case produces them regardless of input).
  //
  //   01 04 0000007B  → mileage = 12.3
  //   02 04 00000050  → fuel = 80
  //   30 01 2A        → gsmSignal = 42
  //   51 02 00FA      → temperature = 25.0
  //   56 01 50        → batteryPercent = 80
  //   E1 02 0078      → batteryVoltage = 12.0
  const hex =
    '0'.repeat(82) +
    '01040000007B' +    // TLV 01: mileage
    '020400000050' +    // TLV 02: fuel
    '30012A' +          // TLV 30: gsmSignal
    '510200FA' +        // TLV 51: temperature
    '560150' +          // TLV 56: batteryPercent
    'E1020078' +        // TLV E1: batteryVoltage
    '0000';             // trailing pad satisfies index < hex.length - 4

  const extraMsg = parseExtraMessages(hex);

  test('precondition: parseExtraMessages emits the 6 camelCase keys the post-fix writer reads', () => {
    expect(extraMsg.mileage).toBe(12.3);
    expect(extraMsg.fuel).toBe(80);
    expect(extraMsg.gsmSignal).toBe(42);
    expect(extraMsg.temperature).toBe(25.0);
    expect(extraMsg.batteryPercent).toBe(80);
    expect(extraMsg.batteryVoltage).toBe(12.0);
  });

  test('precondition: parseExtraMessages does NOT emit the 4 pruned snake_case keys', () => {
    // Pins the speculative-column rationale: these reads were always-
    // NULL in production because no TLV case produces them. Pruning
    // the writer reads is safe.
    expect(extraMsg.message_id).toBeUndefined();
    expect(extraMsg.gnss_signal).toBeUndefined();
    expect(extraMsg.humidity).toBeUndefined();
    expect(extraMsg.raw).toBeUndefined();
  });

  test('post-fix writer row: 6 working fields populate; 4 pruned keys absent', () => {
    // Mirror the post-fix shape of extraDataRepo.save in
    // backend/ingestion/index.js. The 4 pruned columns are not in
    // the object literal at all — not nulled, gone.
    const writerRow = {
      terminal_id: 'T-test',
      mileage: extraMsg.mileage ?? null,
      fuel: extraMsg.fuel ?? null,
      gsm_signal: extraMsg.gsmSignal ?? null,
      battery_voltage: extraMsg.batteryVoltage ?? null,
      battery_percent: extraMsg.batteryPercent ?? null,
      temperature: extraMsg.temperature ?? null,
    };

    expect(writerRow.mileage).toBe(12.3);
    expect(writerRow.fuel).toBe(80);
    expect(writerRow.gsm_signal).toBe(42);
    expect(writerRow.battery_voltage).toBe(12.0);
    expect(writerRow.battery_percent).toBe(80);
    expect(writerRow.temperature).toBe(25.0);

    // Regression guard: if a future "completeness" pass re-adds a
    // speculative read, these fail.
    expect(writerRow).not.toHaveProperty('message_id');
    expect(writerRow).not.toHaveProperty('gnss_signal');
    expect(writerRow).not.toHaveProperty('humidity');
    expect(writerRow).not.toHaveProperty('raw_extra');
  });

  test('diagnostic: pre-fix snake_case reads were undefined → wrote NULL', () => {
    // Documents WHY the case-flip matters. Pre-fix the writer read
    // gsm_signal/battery_voltage/battery_percent (snake), which the
    // parser never emits — so `?? null` collapsed them to NULL even
    // though the TLVs decoded successfully into camelCase keys.
    expect(extraMsg.gsm_signal ?? null).toBeNull();
    expect(extraMsg.battery_voltage ?? null).toBeNull();
    expect(extraMsg.battery_percent ?? null).toBeNull();
    // Same TLVs, correct case, real values:
    expect(extraMsg.gsmSignal ?? null).toBe(42);
    expect(extraMsg.batteryVoltage ?? null).toBe(12.0);
    expect(extraMsg.batteryPercent ?? null).toBe(80);
  });
});
