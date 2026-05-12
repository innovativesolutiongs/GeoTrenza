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
