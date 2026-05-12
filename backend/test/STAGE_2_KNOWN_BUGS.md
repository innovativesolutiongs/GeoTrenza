# Stage 2 Known Bugs

Bugs in `backend/ingestion/` that the Stage 2 rewrite will fix. Each bug
has a regression test under `backend/test/parsers/` that locks current
behavior — so when the fix lands, the test fails and is updated in the
same commit. This document is the cross-reference between bugs, tests,
and fix commits.

Status legend: 🔴 not started · 🟡 fix in progress · 🟢 fixed

---

## Bug 1 — `parseLocationExtra` field names don't match writer expectations  🔴

**File:** `backend/ingestion/utils/locationExtraParser.js`

**Expected behavior:** The parser should emit field names that match what
`ingestion/index.js` (the writer) reads when it builds the database row.
Three pairs are currently mismatched, so the writer reads `undefined`
and the column lands as NULL even though the parser decoded a real
value.

**Current behavior:**

| Parser emits (`locationExtraParser.js`) | Writer reads (`index.js`) | Result |
|---|---|---|
| `signalStrength` | `gsmSignal` | Silently dropped |
| `battery` | `batteryVoltage` | Silently dropped |
| `speedExtra` | `extendedSpeed` | Silently dropped |

`mileage`, `fuel`, `satellites` match on both sides and are not affected.

**Test that locks this:** `backend/test/parsers/locationExtra.test.js`,
"Bug 1: synthetic TLV input — locks buggy field names". The test asserts
the parser's *current* names so the fix commit must update the test in
lockstep with the parser.

**Planned fix commit:** TBD — rename the three parser fields to match
the writer's spelling. The new schema's `positions.telemetry` jsonb
column also uses the writer's names, so the fix aligns both sides at
once. Once the rename lands, also remove the writer-side defensive
fallback if any was added.

---

## Bug 2 — `parseLocationExtra` hardcoded offset 70 (TLVs actually at 82)  🔴

**File:** `backend/ingestion/utils/locationExtraParser.js`, line 7
(`let start = 70`)

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

**Current behavior:** Parser hardcodes `start = 70`, so it eats 12
characters of BCD timestamp bytes as TLV id+length pairs and emits
`unknown_XX` keys for them. The real TLVs that come after are
*sometimes* recovered correctly (if the misread byte count happens to
align) and *sometimes* lost (if alignment shifts).

**Test that locks this:** `backend/test/parsers/locationExtra.test.js`,
"Bug 2: deviceSimulator packet #3 — locks offset-70 garbage output".
Test asserts the current `{unknown_23, unknown_00, unknown_30, unknown_31,
unknown_E1}` output from a real production-shaped packet.

**Planned fix commit:** TBD — read offset from the message body length
header rather than hardcoding. Or, more conservative: hardcode `82` and
add a comment explaining the timestamp offset. The second approach is
safer if the body always has the same layout for this device type.

---

## Bug 3 — `parseExtraMessages` same offset-70 bug as Bug 2  🔴

**File:** `backend/ingestion/utils/extraMessageParser.js`, line 4
(`let index = 70`)

**Expected behavior:** Same as Bug 2 — TLVs begin at offset 82, after
the BCD timestamp.

**Current behavior:** Same code-level bug as Bug 2, listed separately
because it's a separate file that needs its own fix. With the
deviceSimulator's packet #3, the misread is *partial*: the 12-char
timestamp misread happens to consume exactly the same number of bytes
as the real first TLV (mileage), so subsequent iterations realign with
the remaining real TLVs. `gsmSignal`, `satellites`, `batteryVoltage`
decode correctly *despite the bug*; `mileage` is lost and `unknown_23` +
`unknown_00` appear as parsing artifacts.

This partial-correctness is the likely reason no one noticed Bug 2 / Bug
3 in production — most fields reached the dashboard. Anyone diagnosing
"why is mileage always zero?" would have hit it.

**Test that locks this:** `backend/test/parsers/extraMessages.test.js`,
"Bug 3: deviceSimulator packet #3 — locks offset-70 partial-garbage
output".

**Planned fix commit:** TBD — same approach as Bug 2. Both parsers can
land in the same commit since they share the root cause; the tests for
both will need to be updated together.

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

## Bugs not yet tracked

The two main known bugs from `docs/current-state.md` that are NOT in
this list:

- **Speed-triggered engine-immobilizer** — already disabled in Stage 0
  (commented out in `ingestion/index.js`). Stage 4 redesigns with the
  four-condition safeguard.
- **Two parsers running over the same hex region** —
  `parseLocationExtra` and `parseExtraMessages` both scan the trailing
  TLVs of a 0x0200 packet but recognize different ID sets. Not strictly
  a bug, but the Stage 2 rewrite should consolidate to a single TLV
  decoder.

Add new bugs to this list as they're found. When a fix lands, replace
"TBD" with the commit SHA and flip the status emoji.
