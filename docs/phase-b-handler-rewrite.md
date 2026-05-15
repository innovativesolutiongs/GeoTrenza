# Phase B Design — 0x0200 Handler Rewrite to v2 Schema

## Context

Stage 2 includes rewriting `backend/ingestion/index.js`'s 0x0200 (location report) handler to write to the v2 schema created by Stage 1 (`positions`, `events`, `devices`, `trucks`, `geofences`) instead of the legacy tables (`gps_data_legacy`, `gps_alarms_legacy`, `gps_status_legacy`, `gps_extra_location_legacy`, `gps_extra_data_msg_legacy`).

This document captures the architectural decisions for that rewrite, made on 2026-05-13 based on:

- The Mobicom JT808 V2.2 spec at `docs/protocols/mobicom-jt808-v2.2.pdf`
- The Stage 1 schema design at `docs/schema-v2.md`
- A real G107 packet capture decoded against the spec
- Production database state verification (v2 tables present and empty, legacy renamed, ingestion currently writing nothing useful since cutover)

Design lens: **building for scale.** Decisions weighed against future production load (10k+ devices, sustained packet rates, dashboard query performance), not just today's empty-database state. Scale concerns that aren't Phase B blockers are documented as Stage 4 work so they aren't rediscovered later.

## Decision 1: Handler shape

Each 0x0200 packet produces:

- Exactly one row in `positions` table (the location reading)
- Zero or more rows in `events` table (transitions or one-shot alarms detected in the packet)
- Plus an UPDATE to `devices.last_seen_at`

All three writes happen in a single database transaction. If any write fails, the entire packet is rejected and the transaction rolls back.

Replaces the current 4-5 separate `*.save()` calls to legacy tables.

## Decision 2: Transition logic — what counts as an event in Phase B

Phase B writes only inherently-transition-shaped events. Cross-packet state tracking is deferred to Stage 4 per Bug 4's deferral decision.

### One-shot alarm bits — emit events in Phase B

Per Mobicom spec Table 5-6 "After the event occurs, the alarm will only be reported once":

- Bit 0: SOS → event kind `alarm.sos`
- Bit 7: Low power supply voltage → `alarm.low_power`
- Bit 8: Main power off → `alarm.power_off`
- Bit 9: ACC on → `ignition.on`
- Bit 10: ACC off → `ignition.off`
- Bit 11: Main power on → `alarm.power_on`
- Bit 12: Leave fortified area → `alarm.leave_fortified_area`
- Bit 15: Vibration → `alarm.vibration`
- Bit 16: Flip/Fall → `alarm.flip_fall`
- Bit 17: Rapid acceleration → `alarm.rapid_accel`
- Bit 20: Bird death → `alarm.bird_death`
- Bit 21: Birds take off → `alarm.bird_takeoff`
- Bit 27: Illegal ignition → `alarm.illegal_ignition`
- Bit 28: Towing → `alarm.tow`
- Bit 30: Harsh braking → `alarm.harsh_braking`
- Bit 31: Harsh turn → `alarm.harsh_turn`

For each set bit, emit one event row with:

- `kind` = (mapped value above)
- `started_at` = `ended_at` = packet's `recorded_at` timestamp
- `payload` = `{}` (or kind-specific data if the alarm has parameters; none of the above do)
- `position_id` = the id of the position row written in the same transaction

### Maintained alarm bits — log only in Phase B, events in Stage 4

Per Mobicom spec Table 5-6 "The flag is maintained until the alarm condition is released":

- Bit 1: Overspeed
- Bit 2: Fatigue driving
- Bit 4: GNSS module failure
- Bit 5: GNSS antenna not connected
- Bit 6: GNSS antenna short circuit
- Bit 14: Fatigue driving warning
- Bit 18: Cumulative driving overtime
- Bit 19: Overtime parking
- Bit 29: Collision (spec marks as maintained, but functionally feels one-shot — flag for re-evaluation in Stage 4)

These bits require cross-packet state tracking (rising/falling edge detection) for proper event boundaries.

**Phase B treatment:** When a packet contains any maintained alarm bits, the handler emits a structured INFO log line listing the set bits and their meanings. No event rows written. This gives ops visibility into "is overspeed happening right now" without polluting the events table with un-deduplicated rows.

**Stage 4 work:** Implement per-device state cache (in-memory `Map` keyed by `device_id`) that tracks the last-seen state of each maintained bit. Emit events on transitions (rising edge = event starts, falling edge = event `ended_at` populated).

### Status bits — all deferred to Stage 4

The status indicator (4-byte bitmask, separate from alarm indicator) describes current device state (ACC on/off, located, lat hemisphere, etc.). All status bits are state-shaped, not event-shaped. Same Stage 4 treatment as maintained alarm bits.

## Decision 3: positions.telemetry shape

The Stage 1 schema designed `positions.telemetry` as JSONB for sparse/cold TLVs not promoted to typed columns.

Phase B keys this JSONB by parser key names (camelCase) directly, no transformation:

- `telemetry.gsmSignal`
- `telemetry.batteryPercent`
- `telemetry.imei`
- `telemetry.wakeUpSource`
- `telemetry.temperature`
- `telemetry.iccid`
- `telemetry.lightSensor`
- (etc., whatever `extraMessageParser` produces beyond the typed columns)

Hot fields stay as typed columns per `schema-v2.md`:

- `lat`, `lng`, `speed_kph`, `heading_deg`, `altitude_m`
- `satellites`, `signal_strength`, `battery_voltage`, `mileage_m`
- `recorded_at`, `received_at`, `device_id`, `id`

### Scale revision on the 8 KB cap

The Stage 1 schema set `octet_length(telemetry::text) < 8192`. Revising downward to **2 KB** because:

- Realistic Mobicom TLV section is well under 1 KB even with all G107 emissions present
- At 100M position rows scale, 8 KB average JSONB = 800 GB of just-telemetry storage
- Tighter cap forces clean failure if a misbehaving device sends garbage, rather than silent storage waste

CHECK constraint becomes `octet_length(telemetry::text) < 2048`. Migration to tighten the existing constraint is part of Phase B implementation.

### Scale revision on the GIN index

The Stage 1 schema said "GIN index on telemetry deferred until needed." At scale, "needed" is fast — JSONB queries without GIN are sequential scans, which is a P0 dashboard slowness incident waiting to happen.

**Phase B requirement:** Create the GIN index on `positions.telemetry` as part of Phase B's migration, not deferred. The cost of building it once on an empty table is zero. The cost of building it on 10M existing rows later is hours of downtime.

## Decision 4: device_id resolution

Resolution happens at TCP connection auth time (0x0102 handler), not per-packet.

When a device connects and sends 0x0102 (device authorization):

1. Ingestion looks up the `terminal_id` in the `devices` table
2. If not found OR `auth_code` doesn't match: connection rejected (per migration-plan Stage 2 exit criterion "Unknown devices rejected at ingestion")
3. If found: store the `device_id` and `terminal_id` on the connection-state object for the lifetime of the TCP connection
4. All subsequent packets (0x0002 heartbeat, 0x0200 location, etc.) on this connection use the stored `device_id`

When the TCP connection drops, the connection-state object is discarded. Next reconnect re-authenticates.

### Scale revision on G107 short-connection mode

The Mobicom spec describes G107 as supporting both long-connection (continuous TCP, heartbeats every 120s) and short-connection (battery-preserving: connect, send report, disconnect) modes. We don't yet know which mode the G107 fleet will operate in.

**If short-connection mode:** every report is a fresh TCP connection, meaning auth happens per report. At 10k devices reporting every 10 minutes, that's ~17 auth lookups/second to the `devices` table — sub-millisecond requirement.

**Phase B requirement:** Verify the unique index on `devices.terminal_id` exists in production (schema says NOT NULL UNIQUE, but verify the actual index is present). Index lookup makes auth O(log n) regardless of fleet size.

**Stage 4 work:** Add an in-memory LRU cache for `terminal_id` → `(device_id, auth_code)` with 60-second TTL. Short-connection mode devices reconnecting within 60s hit cache, not database. Invalidation on TTL or admin-driven `auth_code` changes.

**Verification task before Phase D (cutover):** Confirm G107 operational mode against a real production G107. Either by observing TCP connection patterns at the network layer, or by configuring a test device to log its connection behavior. This affects Phase D's load expectations.

## Decision 5: devices.last_seen_at update

On every successful 0x0200 packet write (and 0x0002 heartbeat write), `UPDATE devices SET last_seen_at = NOW() WHERE id = $device_id`.

This is part of the same transaction as the `positions` INSERT. If either fails, both roll back.

Enables dashboard's "online truck" query as simple `SELECT * FROM devices WHERE last_seen_at > now() - interval '5 minutes'`.

### Scale revision on UPDATE-per-packet

At low volume, UPDATE per packet is fine. At 10k devices sending every 30s (~333 UPDATE/sec), this becomes a hotspot: WAL volume, vacuum pressure, lock contention on hot device rows.

**Phase B treatment:** Keep UPDATE-per-packet. Simple to reason about, correct, fine at current volume.

**Stage 4 work:** Implement batched async `last_seen_at` updates. In-memory aggregation flushes to database every 5 seconds (batch UPDATE all devices that received packets in that window). Trade: 5-second lag on "is truck online" for 10-100x reduction in UPDATE volume. Acceptable trade for dashboards.

## Decision 6: Transaction boundaries

One transaction per packet. Includes:

- `INSERT INTO positions (...) RETURNING id` (capture id for event linkage)
- For each detected event: `INSERT INTO events (..., position_id = captured_id)`
- `UPDATE devices SET last_seen_at = received_at WHERE id = device_id`

Rollback on any failure. The packet is acknowledged to the device with platform universal ACK 0x8001 result=0 (success) only after the transaction commits. If the transaction fails, the ACK result is 1 (failed), and the device will retry per JT808 protocol.

### Scale revision on concurrent packet processing

Ingestion is currently single-process Node.js. Adequate up to ~1000 packets/sec.

**Stage 4 or Stage 5 work:** When packet rate exceeds single-process capacity, move to:

- pm2 cluster mode (multiple Node processes sharing the TCP listener), or
- Worker pool architecture (one TCP listener, multiple worker processes consuming from a shared queue), or
- Sticky TCP routing across multiple ingestion instances behind a load balancer

This is not a Phase B concern. Phase B's handler should be implemented as a pure function of `(packet, connection_state, transaction) → result`, so it can be invoked by any of these architectures without redesign.

## Observability requirements (Phase C work, called out here so Phase B writes are observable later)

Phase B implementation should be structured to make adding observability easy. Specifically:

- The 0x0200 handler function takes a `context` parameter (object) that carries trace IDs, `terminal_id`, connection metadata. Phase C wires structured logging through this context.
- Every meaningful operation (parse, transaction begin, write, transaction commit, ACK send) is a separate function call, so Phase C can wrap each with timing instrumentation.
- Error paths preserve the raw packet hex (truncated to first 200 bytes) for forensics.

Phase C will implement:

- Every packet write logs: `terminal_id`, `device_id`, `packet_size_bytes`, `event_count_emitted`, `transaction_duration_ms`, result
- Failed packets log: full reason (auth failure, parse error, db error), truncated raw hex
- Metrics: packets/sec by `terminal_id`, events/sec by kind, transaction duration p50/p95/p99
- Health endpoint: `/health` returns `last_packet_at`, `packets_in_last_minute`, `db_connection_status`

## What this design does NOT cover

Phase C work (not in Phase B scope):

- Structured logging (winston/pino)
- pm2 ecosystem file
- Health endpoint
- Updates to 0x0002 heartbeat handler (other than `last_seen_at` logic)
- Cutover plan (separate document and execution window)

Phase B specifically: 0x0200 handler + the prerequisite v2 entity files + the `ormconfig` `synchronize:true` removal + the 0x0102 auth changes for `device_id` resolution + the migration tightening the telemetry cap and adding the GIN index.

## Implementation breakdown

1. Add v2-shape entity files to `backend/ingestion/entities/`:
   - `Position.js` (`positions` table)
   - `Event.js` (`events` table)
   - Replace `Device.js` with v2 shape (`terminal_id`, `imei`, `account_id`, `truck_id`, `auth_code`, etc.)
   - Add `Truck.js`, `Geofence.js` (read-only from ingestion side, full use in Stage 3)

2. Remove `synchronize: true` from `backend/ingestion/ormconfig.js:23` (Stage 1 exit criterion miss, finally addressed)

3. Write migration: tighten `positions.telemetry` CHECK constraint from 8192 to 2048; create GIN index on `positions.telemetry`. Run against production.

4. Rewrite the 0x0200 handler in `backend/ingestion/index.js`:
   - Replace the 4 separate `save()` calls with one transaction
   - Use the alarm bit mapping above for one-shot bits → events
   - Log structured INFO for maintained alarm bits
   - Build the telemetry JSONB from `extraMessageParser` output (`locationExtraParser` is no longer called — Bug 8 deprecation)
   - Update `devices.last_seen_at` in same transaction

5. Update the 0x0102 handler:
   - Resolve `device_id` from `terminal_id` (with unique-index lookup, no cache yet)
   - Validate `auth_code` against `devices.auth_code`
   - Store `device_id` on connection state
   - Reject if not found
   - Verify `devices.terminal_id` unique index exists in production

6. Update tests:
   - Add integration tests for the new handler (mocked TypeORM repos initially, real DB later)
   - Update or remove tests that referenced legacy parsers / writers

7. Verify against the real G107 packet captured today (once clean re-capture lands)

## Open items for Stage 4

Documented in `STAGE_2_KNOWN_BUGS.md` or surfaced in this doc:

- Bug 4: `parseStatus` transitions (cross-packet state)
- Bug 7's column drop migration
- Bug 8: `locationExtraParser` fictional IDs (deprecation finalized in Phase B; column drops in Stage 4)
- Bug 9: `0x53`, `0x54`, `0x5D`, `0x57`, `0xE7`, `0xE8` unhandled parsers
- Maintained alarm bits per Decision 2 (events with proper transition logic)
- Status bits per Decision 2 (events with proper transition logic)
- Collision bit re-evaluation per Decision 2
- In-memory LRU cache for device auth per Decision 4
- Batched async `last_seen_at` updates per Decision 5
- Clustered ingestion architecture per Decision 6

## Pre-cutover verification

Before Phase D (production cutover) executes, the following must be verified:

- G107 operational mode (long-connection vs short-connection)
- Real production G107 packet captures (multiple, different operational states)
- `devices.terminal_id` unique index present in production
- `positions.telemetry` GIN index created in production
- `positions.telemetry` CHECK constraint tightened to 2 KB in production
