# Phase B Step 4 Design — 0x0200 Handler Rewrite Implementation

## Context

Phase B Step 4 is the substantial chunk of remaining Phase B work: rewrite backend/ingestion/index.js's 0x0200 (location report) handler to write to the v2 schema (positions/events/devices) instead of the legacy tables.

The behavior of the rewrite is specified in docs/phase-b-handler-rewrite.md. This document captures the **implementation structure** — how the code is organized, where transactions wrap, how alarm bits are mapped, how errors are handled.

Six implementation decisions made on 2026-05-14:

## Decision A: Function decomposition

The new handler decomposes into testable pieces rather than staying as a single large async function.

Function structure:

- `parseLocationPacket(hex)` — returns structured packet data (alarm bits, status bits, lat, lng, speed, direction, BCD timestamp, TLV extras). Pure function, no I/O.
- `buildPositionRow(packetData, deviceId, receivedAt)` — returns the position insert payload. Maps parsed packet fields to v2 position columns and telemetry JSONB. Pure function.
- `detectOneShotEvents(alarmBits, positionId, recordedAt, deviceId)` — returns an array of event insert payloads, one per set one-shot alarm bit. Pure function.
- `executeTransaction(positionData, events, deviceId, txContext)` — wraps the database writes in a transaction. Inserts position, captures id, inserts events with position_id, updates devices.last_seen_at. I/O function.
- `handle0x0200(packet, connState)` — top-level handler. Orchestrates the above functions, sends ACK to device.

Rationale: testability matters more than line count. Each pure function is independently unit-testable without mocking the database. The transaction function is the only one that needs database mocking for tests.

## Decision B: Alarm bit mapping — lookup table

One-shot alarm bits map to event kinds via a single declarative table, not a switch statement.

```javascript
const ONE_SHOT_ALARM_KINDS = {
  0: 'alarm.sos',
  7: 'alarm.low_power',
  8: 'alarm.power_off',
  9: 'ignition.on',
  10: 'ignition.off',
  11: 'alarm.power_on',
  12: 'alarm.leave_fortified_area',
  15: 'alarm.vibration',
  16: 'alarm.flip_fall',
  17: 'alarm.rapid_accel',
  20: 'alarm.bird_death',
  21: 'alarm.bird_takeoff',
  27: 'alarm.illegal_ignition',
  28: 'alarm.tow',
  30: 'alarm.harsh_braking',
  31: 'alarm.harsh_turn'
};
```

Maintained alarm bits are NOT in this table — those are logged but not turned into events per Phase B design doc Decision 2.

`detectOneShotEvents` iterates over this table, checks each bit against the packet's alarm indicator, emits one event per set bit.

Rationale: declarative, easy to maintain (adding a kind = one line), easy to test (iterate over the table in tests directly).

## Decision C: Transaction boundary — inside executeTransaction()

The database transaction wraps the three writes (position INSERT, events INSERT, device UPDATE) inside `executeTransaction()`. The handler function orchestrates above the transaction layer.

```javascript
async function executeTransaction(positionData, events, deviceId, queryRunner) {
  await queryRunner.startTransaction();
  try {
    const positionResult = await queryRunner.manager.insert(Position, positionData);
    const positionId = positionResult.identifiers[0].id;
    
    if (events.length > 0) {
      const eventsWithPositionId = events.map(e => ({...e, position_id: positionId}));
      await queryRunner.manager.insert(Event, eventsWithPositionId);
    }
    
    await queryRunner.manager.update(Device, deviceId, { last_seen_at: positionData.received_at });
    
    await queryRunner.commitTransaction();
    return positionId;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  }
}
```

Rationale: keeps the handler focused on orchestration. Transaction boundary is explicit and testable.

## Decision D: device_id resolution — per-packet lookup in handler

Step 4 implements device_id resolution as a per-packet database query in the handler. Step 5 will optimize this by moving the lookup to auth (0x0102 handler) and passing device_id forward via connection state.

For Step 4:
```javascript
async function resolveDeviceId(terminalId, deviceRepo) {
  const device = await deviceRepo.findOne({ where: { terminal_id: terminalId } });
  if (!device) {
    throw new UnknownDeviceError(`No device registered for terminal ${terminalId}`);
  }
  return device.id;
}
```

Rationale: keeps Steps 4 and 5 independently committable. Per-packet lookup is documented as a known throwaway pattern (Phase B design doc Decision 4).

## Decision E: Error handling — explicit error categories

The handler classifies failures into explicit categories, each with defined log level and ACK response.

```javascript
const ERROR_CATEGORIES = {
  PARSE_ERROR: { logLevel: 'warn', ackResult: 2, action: 'reject' },        // 2 = message error
  UNKNOWN_DEVICE: { logLevel: 'info', ackResult: 1, action: 'reject' },     // 1 = failed
  DB_CONSTRAINT_VIOLATION: { logLevel: 'error', ackResult: 1, action: 'reject' },
  DB_CONNECTION_ERROR: { logLevel: 'error', ackResult: 1, action: 'reject' },
  UNEXPECTED_ERROR: { logLevel: 'error', ackResult: 1, action: 'reject' }
};
```

The handler maps caught exceptions to categories via instanceof checks (e.g., `UnknownDeviceError`, `QueryFailedError` from TypeORM, etc.) and dispatches accordingly.

ACK result codes per Mobicom JT808 V2.2 spec Table 5-1 (Platform Universal ACK):
- 0 = success/confirm
- 1 = failed
- 2 = message error
- 3 = not support

Rationale: avoids try/catch nesting nightmares. Each error type has explicit, traceable handling.

## Decision F: Legacy code removal — separate cleanup commit

Step 4's commit message: "Stage 2 Phase B: rewrite 0x0200 handler to write positions/events."

A separate follow-up commit handles the cleanup: "Stage 2 Phase B: remove legacy ingestion writers replaced by v2 schema." This commit removes:
- The legacy 0x0200 writer calls (gpsRepo.save, alarmRepo.save, statusRepo.save, extraRepo.save, extraDataRepo.save)
- The legacy entity files (GPS.js, GpsAlarm.js, GpsStatus.js, GpsExtraLocation.js, GpsExtraDatamsg.js, Heartbeat.js, CommandReply.js if not used elsewhere)
- The corresponding ormconfig.js entity registrations
- The locationExtraParser.js file (per Bug 8 — deprecated, replaced by extraMessageParser usage)

Rationale: two commits keep each focused. Step 4's commit reviews as "new code added"; cleanup reviews as "old code removed." Revert is cleaner if either piece has problems.

## Implementation order within Step 4

1. Write `parseLocationPacket()` and tests
2. Write `buildPositionRow()` and tests
3. Write `detectOneShotEvents()` and tests with the alarm bit lookup table
4. Write `executeTransaction()` and tests (requires mock TypeORM repos)
5. Write `resolveDeviceId()` and tests
6. Write error classes (UnknownDeviceError, etc.) and the ERROR_CATEGORIES table
7. Write `handle0x0200()` orchestration
8. Wire `handle0x0200()` into index.js, replacing the legacy handler

Each piece commits separately following the bug-fix discipline pattern.

## Out of scope for Step 4

Explicitly NOT in this step (per Phase B design doc):
- Auth flow changes (Step 5)
- Cross-packet state tracking for maintained alarm bits (Stage 4)
- Status indicator bit handling beyond logging (Stage 4)
- Structured logging library integration (Phase C)
- pm2 supervision (Phase C)
- Cutover (Phase D)

## What this design does NOT cover

Implementation details that should emerge from the code, not be pre-specified:
- Specific TypeORM query construction patterns
- Connection pool sizing
- Retry logic for transient errors (deferred to Stage 4 alongside batched updates)
- Performance tuning (Stage 4 concern)
