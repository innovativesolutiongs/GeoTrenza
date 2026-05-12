# Stage 2 Known Bugs

Bugs in `backend/ingestion/` that the Stage 2 rewrite will fix. Each bug
has a regression test under `backend/test/parsers/` that locks current
behavior — so when the fix lands, the test fails and is updated in the
same commit. This document is the cross-reference between bugs, tests,
and fix commits.

Status legend: 🔴 not started · 🟡 fix in progress · 🟢 fixed

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

## Bug 4 — `parseStatus` emits labels for "off" states, not just transitions  🔴

**File:** `backend/ingestion/utils/statusParser.js`

**Expected behavior:** Status flags should be recorded only when they
*change* (rising/falling edge), not every poll cycle. The new
`events.kind` column with `started_at` / `ended_at` is designed for
this transition model.

**Current behavior:** For bits 0–4 and bit 6, `parseStatus` has both
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

**Planned fix commit:** TBD — replace the parser's `if/else` emissions
with an object describing each flag's current state, and let the
0x0200 handler diff against the device's previous state to compute
transitions. Writes only on transition. The test will then expect
only `["ACC ON", "GPS Fixed"]` (the two bits that *are* set in value
3) and likely also require a device-state cache as test fixture.

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

## Bug 6 — Writer uses `|| null` for nullable numeric fields, coercing legitimate `0` to NULL  🔴

**File:** `backend/ingestion/index.js`, both writer blocks:
- `extraRepo.save({...})` (lines 172–190, 10 `|| null` instances)
- `extraDataRepo.save({...})` (lines 204–222, 10 `|| null` instances)

**Expected behavior:** Field fallbacks should distinguish "value not
present in parser output" (write NULL) from "value present but zero"
(write 0). For nullable numeric columns, `??` (nullish coalescing) is
the correct operator — it falls back only on `undefined`/`null`. `||`
falls back on any falsy value, which includes `0`.

**Current behavior:** Both writer blocks use `value || null` for every
field. When a parser legitimately emits `0` (e.g. `mileage: 0` for a
brand-new device, `satellites: 0` before GPS lock, `speed_ext: 0` for
a parked truck), the `||` operator collapses the 0 to `null` and the
corresponding column is written as NULL instead of 0. The data loss
is silent — no error, no log line, just a row where the
value-was-zero case is indistinguishable from the value-was-missing
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

**Test that locks this:** Not yet. The Bug 6 fix commit will add (or
extend) a regression test asserting that a packet with `mileage = 0`
round-trips through the writer-row shape as `mileage: 0`, not
`mileage: null`. The existing
`backend/test/integration/extras-merge.test.js` is a natural place to
add this, OR a new `writer-zero-coalesce.test.js` if the scope grows.

**Planned fix commit:** TBD — global `|| null` → `?? null` swap
across both `extraRepo.save` and `extraDataRepo.save` blocks (20
occurrences). Pure operator swap; no parser changes, no schema
changes, no handler reorganization. The swap preserves NULL writes
for fields that genuinely aren't in the parser output, and starts
preserving `0` writes for fields whose parser DID emit zero.

---

## Bug 7 — `parseExtraMessages` field names don't match `extraDataRepo` writer expectations  🔴

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

**Test that locks this:** Not yet. The fix commit will add a regression
test asserting `extraMsg.gsmSignal` is read off the camelCase key (or
asserting the column is populated for a packet whose TLVs the parser
decodes).

**Planned fix commit:** TBD. Three possible shapes:
1. Rename writer reads to camelCase (`extraMsg.gsmSignal` etc.) and
   add TLV parsers for the genuinely-missing fields (`message_id`,
   `gnss_signal`, `humidity`, `raw`) if those columns are wanted.
2. Rename parser keys to snake_case (less work if no other readers
   exist; check first).
3. Prune the writer to only the columns the device actually populates,
   treating the missing-TLV columns as cruft. Some of these
   (`humidity`, `raw`, `gnss_signal`) may have been speculatively
   added for TLVs this device never sends.

Decision deferred to the Bug 7 fix design. Stage 4 rewrites this
writer entirely as part of the `positions`/`events` schema migration,
so the in-place fix vs. let-Stage-4-handle-it tradeoff is on the table.

---

## Bugs not yet tracked

The remaining known issue from `docs/current-state.md` that is NOT in
this list:

- **Speed-triggered engine-immobilizer** — already disabled in Stage 0
  (commented out in `ingestion/index.js`). Stage 4 redesigns with the
  four-condition safeguard.

Add new bugs to this list as they're found. When a fix lands, replace
"TBD" with the commit SHA and flip the status emoji.
