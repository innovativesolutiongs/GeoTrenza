# Stage 2 Known Bugs

Bugs in `backend/ingestion/` that the Stage 2 rewrite will fix. Each bug
has a regression test under `backend/test/parsers/` that locks current
behavior — so when the fix lands, the test fails and is updated in the
same commit. This document is the cross-reference between bugs, tests,
and fix commits.

Status legend: 🔴 not started · 🟡 fix in progress · 🟢 fixed · 🔵 deferred — intentionally not fixed in current stage, routed to a later stage

---

## Bug 1 — `parseLocationExtra` field names don't match writer expectations  🟢

**File:** `backend/ingestion/utils/locationExtraParser.js`

**Expected behavior:** The parser should emit field names that match what
`ingestion/index.js` (the writer) reads when it builds the database row.
Three pairs were mismatched, so the writer read `undefined` and the
column landed as NULL even though the parser decoded a real value.

**Pre-fix behavior:**

| Parser emitted (`locationExtraParser.js`) | Writer reads (`index.js`) | Result |
|---|---|---|
| `signalStrength` | `gsmSignal` | Silently dropped |
| `battery` | `batteryVoltage` | Silently dropped |
| `speedExtra` | `extendedSpeed` | Silently dropped |

`mileage`, `fuel`, `satellites` matched on both sides and were not affected.

**Test that locks this:** `backend/test/parsers/locationExtra.test.js`,
"synthetic TLV input — verifies field names match writer reads". The
test now asserts the post-fix names.

**Fix commit:** `64db5c3` — renamed the three parser fields to match
the writer's spelling. The new schema's `positions.telemetry` jsonb
column uses the writer's names too, so the fix aligns parser/writer/
schema at once.

---

## Bug 2 — `parseLocationExtra` hardcoded offset 70 (TLVs actually at 82)  🟢

**File:** `backend/ingestion/utils/locationExtraParser.js`, line 7
(`let start = 82` after the fix)

**Expected behavior:** TLV extras in a JT/T 808 0x0200 location-report
packet begin **after** the BCD timestamp field. Packet body layout:

| Offset | Bytes | Field |
|--------|-------|-------|
| 22–25  | 4     | message serial |
| 26–33  | 8     | alarm |
| 34–41  | 8     | status |
| 42–49  | 8     | latitude |
| 50–57  | 8     | longitude |
| 58–61  | 4     | altitude |
| 62–65  | 4     | speed |
| 66–69  | 4     | direction |
| **70–81** | **12** | **BCD timestamp (YYMMDDHHMMSS)** |
| **82+** | variable | **TLV extras begin here** |

The parser should read TLVs starting at offset **82**, not 70.

**Pre-fix behavior:** Parser hardcoded `start = 70`, so it ate 12
characters of BCD timestamp bytes as TLV id+length pairs and emitted
`unknown_XX` keys for them. The real TLVs that came after were
*sometimes* recovered correctly (if the misread byte count happened to
align) and *sometimes* lost (if alignment shifted).

**Test that locks this:** `backend/test/parsers/locationExtra.test.js`,
"deviceSimulator packet #3 — verifies post-fix TLV decoding from offset
82". Test asserts the post-fix output `{mileage: 0, unknown_30,
unknown_31, unknown_E1}` — note that the three `unknown_*` entries are
real TLVs that `parseExtraMessages` handles (see Bug 5);
`parseLocationExtra` correctly ignores them via its default branch.

**Fix commit:** `c6040d0` — hardcoded `82` with a comment explaining
the timestamp offset. The alternative (reading offset from the message
body length header) was considered but rejected as overkill for a
device type that always sends the same body layout.

---

## Bug 3 — `parseExtraMessages` same offset-70 bug as Bug 2  🟢

**File:** `backend/ingestion/utils/extraMessageParser.js`, line 4
(`let index = 82` after the fix)

**Expected behavior:** Same as Bug 2 — TLVs begin at offset 82, after
the BCD timestamp.

**Pre-fix behavior:** Same code-level bug as Bug 2, in a separate
file. With the deviceSimulator's packet #3, the misread was *partial*:
the 12-char timestamp misread happened to consume exactly the same
number of bytes as the real first TLV (mileage), so subsequent
iterations realigned with the remaining real TLVs. `gsmSignal`,
`satellites`, `batteryVoltage` decoded correctly *despite the bug*;
`mileage` was lost and `unknown_23` + `unknown_00` appeared as parsing
artifacts.

This partial-correctness was the likely reason no one noticed Bug 2 /
Bug 3 in production — most fields reached the dashboard. Anyone
diagnosing "why is mileage always zero?" would have hit it.

**Test that locks this:** `backend/test/parsers/extraMessages.test.js`,
"deviceSimulator packet #3 — verifies post-fix TLV decoding from
offset 82". Test asserts the post-fix output `{mileage: 0,
gsmSignal: 25, satellites: 22, batteryVoltage: 29.8}` — note zero
`unknown_*` entries because parseExtraMessages' case list happens to
cover every TLV ID in this specific packet; see the test's file-level
docstring for the asymmetry vs. parseLocationExtra. Bug 5 still
manifests for both parsers regardless.

**Fix commit:** `5b04088` — same approach as Bug 2: hardcoded `82`
with an explanatory comment. Landed as a separate commit from Bug 2
to keep each parser fix self-contained.

---

## Bug 4 — `parseStatus` emits labels for "off" states, not just transitions  🔵

**File:** `backend/ingestion/utils/statusParser.js`

**Expected behavior:** Status flags should be recorded only when they
*change* (rising/falling edge), not every poll cycle. The new
`events.kind` column with `started_at` / `ended_at` is designed for
this transition model.

**Behavior:** For bits 0–4 and bit 6, `parseStatus` has both
`if` and `else` branches and emits a label every call regardless of
whether the underlying flag changed. The 0x0200 handler in `index.js`
then writes one row to `gps_status_legacy` per emitted label, so the
table records "ACC OFF" / "GPS Not Fixed" / "Door Closed" as if they
were events.

Bits with this both-sides emission pattern: 0 (ACC ON/OFF), 1 (GPS
Fixed/Not Fixed), 2 (Latitude S/N), 3 (Longitude W/E), 4 (Vehicle
Running/Stopped), 6 (Door Open/Closed). Bits 5, 7, 8–10, 13 are
correctly emitted only when set.

**Test that locks this:** `backend/test/parsers/status.test.js`,
"decodes status value 3 (the actual value from deviceSimulator.js
packet #3)". The expected six-element output includes four
`else`-branch labels for bits that are off.

**Planned fix sketch (Stage 4):** replace the parser's `if/else` emissions
with an object describing each flag's current state, and let the
0x0200 handler diff against the device's previous state to compute
transitions. Writes only on transition. The test will then expect
only `["ACC ON", "GPS Fixed"]` (the two bits that *are* set in value
3) and likely also require a device-state cache as test fixture.

**Deferral decision:** Bug 4 is intentionally deferred to Stage 4.
The fix requires per-device state tracking (in-memory Map or
similar), cold-start behavior decisions, and a reshape of
parseStatus's output from array-of-labels to object-of-flag-states
plus a separate transition-computer function. This is meaningful
engineering investment.

The legacy `gps_status_legacy` writer that Bug 4 affects is being
retired in Stage 4 as part of the broader ingestion rewrite that
replaces legacy writes with the new positions/events schema. The
new events table architecture naturally encodes transitions (each
event has a timestamp and a state change), which means Bug 4's fix
dissolves into the schema design rather than being bolted onto a
doomed writer.

Investing in transition logic for the legacy writer would be
throwaway work. Same principle applied here as Bug 7's deferral
of speculative-column TLV parsers.

Production impact during deferral: dashboards continue to receive
"off-state" status labels mixed with real transitions — noisy but
not data-corrupting. Acceptable until Stage 4 lands.

Stage 4 design must include Bug 4's transition logic as a
first-class requirement: events table writes should emit only on
actual state changes, with per-device state tracking handling the
diff.

---

## Bug 5 — `parseLocationExtra` / `parseExtraMessages` dual-parser source mismatch  🟢

**File:** `backend/ingestion/index.js`, the `extraRepo.save({...})`
block immediately after `const extras = parseLocationExtra(hex)` and
`const extraMsg = parseExtraMessages(hex)`.

**Expected behavior:** The writer's read keys should come from the
parser that actually emits them. After both parsers run, every
`*.XXX` reference in `extraRepo.save` should map to a key the named
source object actually contains.

**Pre-fix behavior:** The writer read four keys from `extras` that
`parseLocationExtra` never emits — they're only decoded by
`parseExtraMessages` (or not at all):

| Writer read (pre-fix, all off `extras`) | Where the value actually lives          |
|------------------------------------|-----------------------------------------|
| `extras.alarmEvent`                | Nowhere — not emitted by either parser  |
| `extras.temperature`               | `parseExtraMessages` case `51` (÷10)    |
| `extras.fuelSensor`                | `parseExtraMessages` case `50`          |
| `extras.externalVoltage`           | `parseExtraMessages` case `61` (÷100)   |

Result: the corresponding columns in `gps_extra_location_legacy`
(`alarm_event`, `temperature`, `fuel_sensor`, `external_voltage`) had
been **always NULL in production** since launch, regardless of what
the device actually reported. This was the same root cause as the
"two parsers running over the same hex region" issue — formerly listed
under "Bugs not yet tracked" until the audit produced concrete
production impact.

**Test that locks this:** `backend/test/integration/extras-merge.test.js`.
A synthetic packet with TLVs `01/30/51/50/61` is run through both
parsers and the writer-row shape from `index.js` is reconstructed and
asserted. The test pins three things: (1) `parseLocationExtra` does
not emit the four broken keys (precondition), (2) `parseExtraMessages`
emits `temperature`/`fuelSensor`/`externalVoltage` from TLVs 51/50/61,
(3) the post-fix writer row reads each field from the correct parser
and reading e.g. `mileage` off `extras` is preserved (regression guard
against future "simplifications").

**Fix commit:** `e0107ba` — selective merge in `index.js`. Both
parsers are called, the writer reads
`alarm_event`/`temperature`/`fuel_sensor`/`external_voltage` from
`extraMsg` (parseExtraMessages's output) and every other field from
`extras` (parseLocationExtra's output) — no spread, no implicit
precedence. This avoids the spread-order ambiguity for fields both
parsers emit (e.g. `batteryVoltage` from TLV 06 raw-int vs TLV E1
÷10): `battery_voltage` continues to read off `extras` exclusively,
preserving production unit semantics.

**Known not fixed by this commit — `alarm_event`:** No parser emits
`alarmEvent`. The TLV ID for JT/T 808 alarm events (`0x14` per the
spec, or potentially a device-specific TLV) is not implemented in
either `parseLocationExtra` or `parseExtraMessages`. After this fix
the column reads `extraMsg.alarmEvent`, which is still `undefined →
NULL`. Adding alarm decoding is a separate Stage 2 "new parsers"
item; track as a follow-up bug or under Stage 2 parser-coverage work.

**Deferred — single-decoder consolidation:** Option (1) from the
original plan (consolidate both parsers into a single TLV decoder) is
deferred to Stage 4 cleanup. The selective-merge path keeps both
parsers in place but ensures no field is read from a parser that
doesn't emit it. The remaining duplication (both parsers walking the
same hex region, sometimes producing the same key from different TLV
IDs) is a code-organization concern, not a correctness one once this
fix lands.

---

## Bug 6 — Writer uses `|| null` for nullable numeric fields, coercing legitimate `0` to NULL  🟢

**File:** `backend/ingestion/index.js`, both writer blocks:
- `extraRepo.save({...})` (lines 172–190, 10 `|| null` instances)
- `extraDataRepo.save({...})` (lines 204–222, 10 `|| null` instances)

**Expected behavior:** Field fallbacks should distinguish "value not
present in parser output" (write NULL) from "value present but zero"
(write 0). For nullable numeric columns, `??` (nullish coalescing) is
the correct operator — it falls back only on `undefined`/`null`. `||`
falls back on any falsy value, which includes `0`.

**Pre-fix behavior:** Both writer blocks used `value || null` for every
field. When a parser legitimately emits `0` (e.g. `mileage: 0` for a
brand-new device, `satellites: 0` before GPS lock, `speed_ext: 0` for
a parked truck), the `||` operator collapsed the 0 to `null` and the
corresponding column was written as NULL instead of 0. The data loss
was silent — no error, no log line, just a row where the
value-was-zero case was indistinguishable from the value-was-missing
case.

**Fields where this bites in production:**

| Field | Where read | Why `0` is a real reading |
|---|---|---|
| `mileage` | extraRepo + extraDataRepo | Brand-new device, odometer not yet incremented |
| `fuel` | extraRepo + extraDataRepo | Empty tank |
| `speed_ext` | extraRepo | Vehicle stopped — **highest-volume case** |
| `signal_strength` / `gsm_signal` | extraRepo + extraDataRepo | Cellular dead zone |
| `satellites` | extraRepo | No GPS fix yet — common at startup and indoors |
| `temperature` | extraRepo + extraDataRepo | 0°C — rare but real |
| `battery_percent` | extraDataRepo | Dead battery |
| `humidity` | extraDataRepo | 0% — unlikely but possible |
| `gnss_signal` | extraDataRepo | Same as signal_strength |

**Concrete evidence:** `deviceSimulator.js` packet #3 contains TLV
`01 04 00000000` (mileage = 0). On the smoke-test path,
`extraRepo.save` writes `mileage: NULL` instead of `mileage: 0`
because of `extras.mileage || null`. This is reproducible right now
without changing any code.

**Highest-volume real-world cases:** `speed_ext = 0` (every parked
truck on every poll cycle) and `satellites = 0` (every packet during
GPS warmup or indoor operation). The legacy `gps_extra_location_legacy`
table has been losing both of these to NULL on every applicable
packet since launch.

**Fields where `|| null` is semantically equivalent (so the swap is a
no-op):** `alarm_event` (bitmask; `0 = no alarms` and NULL both mean
"nothing to report"), string-valued fields like `raw_extra` / `iccid`
(empty string is unlikely to be a real reading). These don't *break*
under `??` either — applying the operator uniformly is cleaner than
per-field judgment.

**Discovery context (Notes):** This bug was **not** identified during
the Bug 5 design phase. It surfaced *only* in the failure output of
Bug 5's integration test
(`expect(writerRow.signal_strength).toBe(extras.gsmSignal)` — `null`
≠ `undefined`), where `extras.gsmSignal || null` coerced
`undefined → null`. At the time, the failure was diagnosed as a
test-side artifact and worked around by extending the synthetic
packet with TLV `04` so `extras.gsmSignal` got a real non-zero value.
The underlying production bug — `||` coercing legitimate `0` values
to NULL — was not promoted to a tracked bug at that point. The Bug 5
fix commit (`e0107ba`) is therefore correct on the cross-parser merge
but inherits the `|| null` shape verbatim from the pre-existing
writer. This entry documents the bug for what it actually is and
traces its real history: it has existed since this writer code was
written (predating all of Stage 2), and was only *observable* during
Bug 5 testing because of an incidental assertion shape.

**Test that locks this:** `backend/test/integration/extras-merge.test.js`,
new `describe` block "writer-zero-coalesce: Bug 6 — `?? null` preserves
legitimate 0 readings". Three tests: (1) precondition that
`parseLocationExtra` emits `mileage === 0` for TLV `01 04 00000000`,
(2) regression guard that the post-fix writer row preserves
`mileage: 0` via `?? null`, (3) diagnostic-as-test pinning the pre-fix
`|| null` behavior of coercing 0 to null so the operator distinction
is documented in-place.

**Fix commit:** `b7095db` — global
`|| null` → `?? null` swap across both `extraRepo.save` and
`extraDataRepo.save` blocks (20 occurrences). Pure operator swap; no
parser changes, no schema changes, no handler reorganization. The
swap preserves NULL writes for fields that genuinely aren't in the
parser output, and starts preserving `0` writes for fields whose
parser DID emit zero. Note: in the `extraDataRepo` block, 7 of 10
fields read keys `parseExtraMessages` doesn't emit (see [Bug 7](#bug-7--parseextramessages-field-names-dont-match-extradatarepo-writer-expectations-)),
so the operator swap is a no-op there for those fields — the actual
production fix for that block lives in Bug 7.

---

## Bug 7 — `parseExtraMessages` field names don't match `extraDataRepo` writer expectations  🟢

**File:** `backend/ingestion/index.js`, the `extraDataRepo.save({...})`
block (lines 200–224)

**Expected behavior:** Same shape as Bug 1, but for the second writer
block. The writer's `extraMsg.X` reads should reference keys that
`parseExtraMessages` actually emits.

**Pre-fix behavior:** The writer reads 7 keys that `parseExtraMessages`
never emits — either case-mismatched (parser is camelCase, writer is
snake_case) or referencing a TLV the parser doesn't implement at all:

| Writer reads (`extraDataRepo`) | Parser emits | Mismatch type |
|---|---|---|
| `extraMsg.message_id`     | (nothing)         | Never emitted |
| `extraMsg.gsm_signal`     | `gsmSignal`       | Case mismatch |
| `extraMsg.gnss_signal`    | (nothing)         | Never emitted (no GNSS TLV) |
| `extraMsg.battery_voltage`| `batteryVoltage`  | Case mismatch |
| `extraMsg.battery_percent`| `batteryPercent`  | Case mismatch |
| `extraMsg.humidity`       | (nothing)         | Never emitted (no humidity TLV) |
| `extraMsg.raw`            | (nothing)         | Never emitted |

3 of 10 fields work correctly: `mileage`, `fuel`, `temperature` — they
match the parser's camelCase output because the names are all-lowercase
to begin with.

**Production impact:** The `gps_extra_messages_legacy` table has 7
always-NULL columns regardless of what the device sends. Same root
cause as Bug 1, separate writer block, separate columns.

**Discovery context:** Found during the Bug 6 audit. The Bug 6 fix
(`|| null` → `?? null`) is a no-op for these 7 fields because
`undefined ?? null` and `undefined || null` both → `null` — the
operator change is correct but doesn't surface the underlying read-key
problem. This bug is the actual reason 7 of those columns are NULL in
production; the `||` operator is incidental for the
extraDataRepo block (it matters for extraRepo, where all read keys
match the parser).

**Test that locks this:** `backend/test/integration/extras-merge.test.js`,
describe block `extraDataRepo-shape: Bug 7 — writer reads camelCase
keys parseExtraMessages emits`. Four tests:
1. Precondition that `parseExtraMessages` emits the 6 camelCase keys
   the post-fix writer reads (`mileage`, `fuel`, `gsmSignal`,
   `temperature`, `batteryPercent`, `batteryVoltage`).
2. Precondition that `parseExtraMessages` does NOT emit the 4 pruned
   snake_case keys (`message_id`, `gnss_signal`, `humidity`, `raw`) —
   pins the speculative-column rationale.
3. Post-fix writer row shape: 6 working fields populate; `toHaveProperty`
   regression guards confirm the 4 pruned keys are absent from the
   `extraDataRepo.save` literal entirely.
4. Diagnostic: documents why the case-flip matters by asserting that
   pre-fix snake_case reads collapsed to `null` even though the TLVs
   decoded into camelCase keys.

**Fix commit:** `4ddf2d9` — chose option 3 (prune speculative reads) plus
the case-rename half of option 1 (no new TLV parsers added — Stage 4
redesigns this writer, so adding parsers for `message_id`,
`gnss_signal`, `humidity`, `raw` would be throwaway work).
Post-fix the writer reads 6 keys and they all match parser output.

**Stage 4 followup:** `gps_extra_messages_legacy` retains 4 columns
no longer written by ingestion (`message_id`, `gnss_signal`,
`humidity`, `raw_extra`). They will be NULL for every row inserted
after this commit. Spec audit against Mobicom JT808 Protocol V2.2
(see [[reference_mobicom_jt808_spec]]) determines each column's
Stage 4 disposition:

- **`message_id`** — Not in the spec as a top-level TLV. Truly
  speculative, no real data behind it. **Drop in Stage 4.**

- **`gnss_signal`** — Duplicate naming of TLV `0x31`, which
  `parseExtraMessages` already decodes into the `satellites`
  column. The spec calls TLV `0x31` "GNSS Signal" but defines it
  as "Number of positioning satellites" — same field, two names.
  **Drop in Stage 4** since `satellites` already captures this
  data correctly. Stage 4 must avoid carrying both names forward
  on the new schema for what is one underlying reading.

- **`humidity`** — Real TLV `0x58` in the spec (added V1.8,
  2024-09-16): "Humidity (4 channels), 8 bytes, two bytes per
  channel, unit: 1/10 degree." Catalogued for the G102 / G106 /
  G108 / G108P device families (wiring trackers). The current
  target device is G107 (battery-powered, no humidity sensor),
  so this column is dead for the current fleet. **Drop in Stage 4**
  as part of the legacy table retirement. If the device mix later
  expands to a wiring-tracker family, a parser for TLV `0x58`
  plus a corresponding column on the new schema would unlock real
  data — but that's a future-fleet decision, not a Stage 4
  blocker.

- **`raw_extra`** (writer reads `extraMsg.raw`) — Not a standard
  TLV. Most likely a debug catchall from earlier development.
  Truly speculative with no spec backing. **Drop in Stage 4.**

Bottom line: all four columns drop cleanly when the
`positions`/`events` schema migration retires
`gps_extra_messages_legacy`. The "backfill via new TLV parsers"
option from the original Stage 4 decision space only applies to
`humidity` (the one real TLV), and only if/when wiring-tracker
devices enter the fleet.

---

## Bug 8 — `locationExtraParser` fictional TLV IDs cause silent data corruption on real G107 packets  🔵

**Files:**
- `backend/ingestion/utils/locationExtraParser.js` (cases `0x03`, `0x04`, `0x05`, `0x06`)
- `backend/ingestion/utils/extraMessageParser.js` (case `0xF9` — additional fictional ID)
- `backend/ingestion/index.js` `extraRepo.save({...})` block — consumes the corrupted output

**Expected behavior:** Each parser case should reference a TLV ID the
spec actually defines, with the parser's output key matching the
spec's field semantics. If a parser emits a key, it should reflect a
real device reading — not a misattributed value from a different
field.

**Behavior:**

- **`locationExtraParser` cases `0x03`, `0x05`, `0x06` reference TLV
  IDs that don't exist in the Mobicom JT808 V2.2 spec at all.**
  Verified against `docs/protocols/mobicom-jt808-v2.2.pdf` (full
  Table 5-10 audit). These cases are dead code unless the device
  coincidentally emits a non-spec TLV with one of these IDs.

- **`locationExtraParser` case `0x04` is wrong-semantic.** Spec
  defines TLV `0x04` (G107 explicit, also G109-MK) as 2-byte battery
  status: 1st byte = charger-connected flag (`0x00` connected /
  `0x01` not connected), 2nd byte = battery percent (1-100).
  locationExtraParser stores the raw 2-byte value under
  `extras.gsmSignal`, and `extraRepo.save` then writes that value
  into the `signal_strength` column.

- **Verified on a real captured G107 packet** (audit done after spec
  PDF was committed at `docs/protocols/`): the packet contains TLV
  `0x04` with value `0x0124`. locationExtraParser's case `0x04`
  would emit `extras.gsmSignal = 292`. The writer persists `292`
  into `gps_extra_location_legacy.signal_strength`. The real values
  thrown away: charger-not-connected flag (`0x01`) and battery
  percent (`0x24` = 36%).

- **`extraMessageParser` case `0x04` is partial.** It correctly names
  the field `batteryStatus` but stores it as raw hex string
  (`"0124"`) without decoding the structured 2-byte format.
  Compounding this: `extraDataRepo.save` does not read
  `batteryStatus`, so this captured-but-unstructured value is
  discarded entirely. Net effect: extraMessageParser correctly
  identifies `0x04` but loses the data anyway.

- **`extraMessageParser` case `0xF9` is also fictional.** No TLV
  `0xF9` defined in the spec. Currently maps to `batteryPercent`,
  which conflicts with the spec-correct case `0x56` already mapping
  to the same key (last-write-wins if both hypothetically present).

**Test that locks this:** None yet. Bug 8 is documented from the
spec PDF audit (`docs/protocols/mobicom-jt808-v2.2.pdf`) plus the
real-packet decode. Adding regression tests would require either:
(a) a synthetic packet fixture exercising TLV `0x04`, asserting that
the corruption manifests (diagnostic-as-test pattern, similar to Bug
6's pre-fix diagnostic), or (b) deferring the test to Stage 4
alongside the parser rewrite. **Currently no test in
`backend/test/parsers/`.**

**Planned fix sketch (Stage 4):** Discard `locationExtraParser`
entirely as part of the Stage 4 ingestion rewrite. The new
positions/events writer should consume only spec-correct TLV
decodes from a unified parser. For TLV `0x04`: emit
`chargerConnected: boolean` and `batteryPercent: number` as separate
keys, with the new schema receiving them as separate columns or a
structured `battery_status` jsonb field. Drop case `0xF9` from
extraMessageParser (or its replacement) since no TLV `0xF9` exists.

**Deferral decision:** Bug 8 is intentionally deferred to Stage 4.
Same principle as Bug 4 and Bug 7's speculative-column deferrals:
the legacy `gps_extra_location_legacy` writer that this corruption
flows into is being retired in Stage 4 as part of the broader
ingestion rewrite. Investing in fixing `locationExtraParser` would
be throwaway work — the parser itself goes away.

Production impact during deferral: `signal_strength` column on
`gps_extra_location_legacy` is corrupted on every real G107 packet
(writes battery-status bytes, not signal strength). Acceptable
because (a) no real fleet is deployed yet — the G107 packet that
confirmed the bug was a single sample capture, (b) Stage 4 retires
the affected table entirely. The data corruption does not propagate
beyond this single legacy column.

Stage 4 design must include: (1) `locationExtraParser` is not part
of the new ingestion path, (2) TLV `0x04` is decoded via structured
2-byte parse into charger-flag + battery-percent fields, (3) the
new schema's signal-strength column (if any) populates only from
TLV `0x30` via parseExtraMessages's replacement.

---

## Bug 9 — G107 emits real TLVs that no parser handles, losing operational data  🔵

**Files:**
- `backend/ingestion/utils/extraMessageParser.js` and
  `backend/ingestion/utils/locationExtraParser.js` — both fall
  through to `default` case, emitting `unknown_<ID>` keys that the
  writer ignores.

**Expected behavior:** TLVs that G107 actually emits in production
should be decoded into named keys the writer can persist. The
spec's per-TLV "device" annotation in Table 5-10 is a guide, not
exhaustive — devices can emit TLVs not listed for them.

**Behavior:** A real G107 packet captured from production EC2 and
decoded against the spec PDF (`docs/protocols/mobicom-jt808-v2.2.pdf`)
contains two TLVs that no parser handles:

- **TLV `0x5D` — 4G base station data.** Spec format: 1-byte count,
  then n*10 bytes per cell (MCC 2B, MNC 1B, LAC 2B, CELLID 4B,
  signal 1B). The captured packet had 4 cell entries (MCC 404, LAC
  2060, four neighboring CELLIDs). Both parsers fall through to
  `extras.unknown_5D` / `extraMsg.unknown_5D`; writer doesn't read
  either. **Lost entirely.** Operational impact: device is reporting
  cell-tower-based positioning fallback data that could be used
  when GPS is weak — currently invisible to the platform.

- **TLV `0x57` — state extension with alarm bits.** Spec format: 8
  bytes — bytes 0-1 alarm status, 2-3 switch status, 4-7 reserved.
  Spec attributes this TLV to AT08N / W600 device families, but the
  captured G107 packet emits it with alarm-status `0x0002` set (per
  spec definition: "Anti-disassembly alarm (W600)"). Both parsers
  fall through; writer doesn't read. **Anti-tamper alarm event
  silently dropped.**

**Spec's device-list field is not exhaustive** — yesterday's audit
flagged this as a caveat, today's packet capture confirms it.
Per-TLV device attribution in Table 5-10 should be treated as
"documented for these devices" not "only emitted by these devices."
Future parser work should decode TLVs the device actually sends,
regardless of whether G107 is in the spec's device list.

**Other potentially-emitted-but-unhandled TLVs** (G107-explicit per
spec, not seen in this single capture but expected in other packet
types or device states): `0x53` 2G base station data, `0x54` Wi-Fi
data, `0x56` battery percent (currently behind Bug 8's path
conflict), `0xEE` battery percent (third path), `0xFB` wake-up
source, `0xFC` IMEI. See [[reference_mobicom_jt808_spec]] and the Q5
column of the verification report from the packet-capture audit.

**Test that locks this:** None yet. Bug 9 is documented from a
single real-packet capture plus the spec PDF audit. A synthetic
packet fixture exercising `0x5D` and `0x57` would lock current
"falls through to unknown" behavior; the fix would replace those
assertions with structured decodes. **Currently no test in
`backend/test/parsers/`.**

**Planned fix sketch (Stage 4):** New unified TLV decoder in the
Stage 4 ingestion path should include `0x5D` and `0x57` as
first-class cases.

- `0x5D` cell tower data should likely flow to a new
  `positions.cell_towers` jsonb column (array of
  `{mcc, mnc, lac, cellid, signal}` objects) or an
  `events.cell_tower_reading` row per scan, since the data is
  structurally rich and not column-shaped.

- `0x57` alarm bits should map to `events` rows with
  `kind = 'anti_disassembly_alarm'` etc., one event per set bit,
  dovetailing with Bug 4's transition-only events model.

**Deferral decision:** Bug 9 is intentionally deferred to Stage 4.
Same reasoning as Bug 4 / 7 / 8: the legacy writers don't have
columns for cell-tower data or extension alarms, so adding parsers
without a place to write them would be half-done work. Stage 4's
`positions`/`events` schema is where these naturally land.

Production impact during deferral: cell tower fallback positioning
data and anti-tamper alarms are silently dropped. Acceptable
because (a) no real fleet deployed yet, (b) GPS positioning works
without cell-tower fallback in clear-sky conditions, (c)
anti-tamper alarms are noise-level for a development single-device
sample. **However**: once the fleet is deployed, anti-tamper alarms
becoming visible should be treated as a Stage 4 acceptance
criterion, not an optional nice-to-have.

---

## Bugs not yet tracked

The remaining known issue from `docs/current-state.md` that is NOT in
this list:

- **Speed-triggered engine-immobilizer** — already disabled in Stage 0
  (commented out in `ingestion/index.js`). Stage 4 redesigns with the
  four-condition safeguard.

Add new bugs to this list as they're found. When a fix lands, replace
"TBD" with the commit SHA and flip the status emoji.
