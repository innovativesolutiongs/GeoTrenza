# Migration Plan — five stages from "two disconnected halves" to "production fleet platform"

This is the integration plan that takes the system from where it is today (described in [`architecture-current.md`](./architecture-current.md) and [`current-state.md`](./current-state.md)) to a production-grade fleet management platform.

The plan is split into five stages. Each stage is a coherent unit of work with its own exit criteria. We do not start Stage N+1 until Stage N's exit criteria are met. Within a stage we may iterate.

A note on time estimates: these are **rough developer-weeks** assuming one engineer working full-time. They are planning estimates, not commitments. Real time will depend on prod-data surprises, RDS access, and how much of the "to be confirmed" list in `architecture-current.md` we close out before each stage begins.

---

## Stage 0 — Setup *(in progress)*

**Goal.** Get the two codebases under one roof, remove the most obvious foot-gun (auto engine-cut), and write down what we know so future work is grounded in a shared understanding.

**Key tasks.**
- Move the standalone ingestion repo (formerly `~/truck-iot/simulator/`) into `platform/backend/ingestion/` on a new branch `integration/stage-0-setup`.
- Disable the `speed > 100 → ENGINE_LOCK` block in `backend/ingestion/index.js` (comment out, do not delete; redesign in Stage 4).
- Write three docs: `architecture-current.md` (this baseline), `migration-plan.md` (this file), `phase-1-scope.md` (the locked product scope).

**Exit criteria.**
- `integration/stage-0-setup` branch exists with the moved code and the disabled block.
- All three docs in `platform/docs/` are written and reviewed.
- Branch reviewed and pushed (push happens at the end of Stage 0, not during).

**Rough time estimate.** ~1 developer-day.

---

## Stage 1 — Schema redesign

**Goal.** Replace the current append-everything telemetry tables with a small, joinable schema that reflects what a fleet dashboard actually needs to query: positions over time, events when they happen, and a unified device registry that both halves agree on.

**Key tasks.**
- Design the new schema. At minimum:
  - **`positions`** — one row per GPS fix; columns include `device_id` (FK), `recorded_at`, `lat`, `lng`, `speed`, `heading`, `altitude`, `satellites`, `signal_strength`, `battery_voltage`, `mileage`. Indexed on `(device_id, recorded_at DESC)` for the live-map and route-history queries.
  - **`events`** — one row per *transition* (alarm raised, alarm cleared, ignition on/off, geofence enter/exit, power-cut, SOS, movement-when-parked). Replaces the noisy `gps_alarms` and `gps_status` tables. Columns: `device_id`, `kind`, `payload jsonb`, `started_at`, `ended_at` (nullable).
  - **`devices`** — unified table that the dashboard *and* the ingestion both read/write. Columns: `id`, `terminal_id`, `imei`, `customer_id` (FK), `truck_id` (FK), `auth_code`, `firmware_version`, `last_seen_at`, `created_at`. Replaces the two conflicting `devices` definitions.
  - **`trucks`**, **`customers`**, **`allotments`** (or whatever final name): rationalized from the current `accounts` / `accounts_dtl` / `allotments` muddle, with foreign keys.
  - **`geofences`** — circular and polygon zones owned by a customer.
- Drop or archive: `gps_data`, `gps_alarms`, `gps_status`, `gps_extra_location`, `gps_extra_data_msg`, `heartbeats`, `command_reply` (their useful contents will be re-derived in `positions` / `events` / a `device_telemetry` JSON column).
- Write the migrations as TypeORM migrations under `backend/src/migration/`. Stop using `synchronize: true` anywhere.
- Apply migrations to a snapshot of `gps_services` first, then to staging, then to production with downtime planned.
- Backfill: write a one-off script that reads existing `gps_data` rows into the new `positions` shape so we don't lose history (subject to confirmation that the old data is worth keeping — old rows have known data-quality issues from the parser bug).

**Exit criteria.**
- Migration files committed and reviewed.
- Migrations apply cleanly against a fresh DB and against an `gps_services` snapshot.
- Production `gps_services` is on the new schema. Old tables either dropped or renamed `_legacy_*`.
- `synchronize: true` removed from `ingestion/ormconfig.js`.
- ER diagram of the new schema lives in `platform/docs/`.

**Rough time estimate.** 1–2 weeks.

---

## Stage 2 — Migrate ingestion to new schema *(✅ complete — 2026-05-15)*

Closed via merge commit `b1658d8`. v2 ingestion live on EC2 and verified end-to-end with simulator-driven test on 2026-05-15 — see `docs/session-logs/2026-05-15.md` postscript for proof points (auth + heartbeat + position rows landing correctly, structured pino logs, transaction durations 4–11ms).

**Goal.** Make the ingestion service write to the new tables, fix the parser bugs that have been silently dropping data, and add the protocol features the dashboard will need (extended alarms, IMEI, battery percent).

**Key tasks.**
- Refactor `backend/ingestion/index.js` so the 0x0200 handler writes one row to `positions` and emits zero-or-more rows to `events` based on transitions (rising-edge of alarm bits, ignition state changes, etc.) instead of the current "row per check" pattern.
- Fix the field-name mismatch between `parseLocationExtra` and the writer (`signalStrength` vs `gsmSignal`, `battery` vs `batteryVoltage`, `speedExtra` vs `extendedSpeed`). Drive the column list off a single shared key map.
- Add missing JT/T 808 / Mobicom V2.2 extension parsers:
  - `0xFC` — IMEI (so we can join positions to a real device identity, not just `terminalId`).
  - `0xE7` / `0xE8` — extended alarm fields.
  - `0xEE` — battery percent.
- Replace the noisy `parseStatus` "off" emissions with proper transition tracking.
- Add structured logging (replace `console.log` emoji noise with a real logger — `pino` or `winston` — at info/warn/error levels with `terminalId` as a structured field).
- Add basic auth on the device side: validate the `0x0102` auth code against the `devices.auth_code` column instead of blindly inserting any device that connects.
- Keep the engine-immobilizer disabled (still commented out from Stage 0).

**Exit criteria.**
- A live G107 connected to staging writes correct rows to `positions` and `events`, with non-null sensor fields where the device sent them.
- Unknown devices (no matching `auth_code`) are rejected at ingestion, not silently saved.
- Logs are structured JSON with `terminalId` filterable.
- Unit tests cover the parsers (we have packet hex examples in `deviceSimulator.js` already).

**Rough time estimate.** 2–3 weeks.

---

## Stage 3 — Connect the dashboard to real data

**Goal.** Make the maps and tables on the dashboard show real, current truck data instead of the hardcoded Indian-city markers. This is the first stage that produces visible user-facing change.

**Key tasks.**
- Backend API:
  - `GET /api/positions/latest` — most recent position per device (for the live map).
  - `GET /api/positions?device_id=X&from=...&to=...` — historical track for route playback.
  - `GET /api/events?device_id=X&from=...&to=...` — events feed (alarms, geofence, ignition).
  - `GET /api/devices/me` — devices visible to the current user (scoped by customer).
- Apply auth middleware to **every** `/api/*` route. Reject unauthenticated requests at the router level, not the handler level. (Real JWT and bcrypt land in Stage 4; Stage 3 can use a simple session check.)
- Frontend:
  - Replace the hardcoded marker arrays in `dashbord/index.tsx`, `Locations/livelocation.tsx`, `Locations/truckroutes.tsx` with data from the new endpoints.
  - Build a real route-playback page: time slider, polyline of historical positions, marker that animates along the path. (Replaces the duplicate truckroutes.tsx that currently shows static city markers.)
  - Build an events feed component (sortable, filterable by kind / device / time range).
  - Add live updates — start with polling (every 10–30s) to avoid websocket complexity in this stage.
- Wire device-to-customer scoping so non-admin users only see their own fleet's positions and events.

**Exit criteria.**
- Logging in as a customer shows that customer's actual trucks on the map at their actual current locations.
- Selecting a truck and a date range plays back the actual route.
- The events feed shows real alarms generated in Stage 2.
- Zero hardcoded marker arrays remain in the frontend.
- An unauthenticated request to any `/api/*` endpoint returns 401.

**Rough time estimate.** 3–4 weeks.

---

## Stage 4 — Production hardening

**Goal.** Make the system safe to expose to real customers in production, and safely re-enable the engine-immobilizer with the safeguards required.

**Key tasks.**
- **Auth & secrets.**
  - bcrypt (cost 12+) every existing password in `users` and `accounts` (one-off migration script).
  - Replace session cookies with JWT in httpOnly + secure + SameSite=Lax cookies.
  - Move `SESSION_SECRET`, DB credentials, and any future API keys to AWS Secrets Manager or SSM Parameter Store; remove from `.env` files in production.
- **HTTP hygiene.**
  - `helmet()` on the Express app.
  - Rate limiting on `/api/auth/*` and `/api/positions/latest` (the latter will be polled aggressively).
  - Input validation: `zod` or `joi` schemas on every controller.
- **Packaging & deployment.**
  - Dockerize backend, ingestion, and frontend separately. Three images, one `docker-compose.yml` for local dev.
  - CI on push to `main`: lint, type-check, test, build images, push to ECR.
  - CD pipeline: blue/green or rolling deploy to EC2 (or migrate to ECS/Fargate now if we're already containerizing — decision point).
- **Observability.**
  - Centralized logs (CloudWatch Logs or an external aggregator).
  - Basic dashboard: ingestion packet rate, parse error rate, position write latency, API p50/p95.
  - Alerting on: ingestion process down > 2 min, parse error rate > 1%, RDS connection saturation, disk > 80%.
- **Re-enable engine-immobilizer with safeguards.** The block disabled in Stage 0 comes back, but only when **all four** are true: (1) explicit operator confirmation in the dashboard UI, (2) the truck is currently inside a customer-defined "lock zone" geofence, (3) reported speed is exactly 0 km/h, (4) the customer has opted in to remote immobilizer at signup. Logged with operator identity.

**Exit criteria.**
- Penetration test (internal or external) against staging shows no critical findings.
- A new deploy reaches production via CI/CD with no SSH-into-the-box steps.
- An on-call playbook exists for: ingestion down, RDS down, sudden parse-error spike.
- The immobilizer redesign passes a tabletop review against the four-condition safeguard.

**Rough time estimate.** 2–3 weeks.

---

## Stage 5 — Region migration *(deferred)*

**Goal.** Move from AWS `us-east-1` to a region closer to the customers and the trackers (currently India), and reduce hosting cost. Likely target: Hetzner (Germany or Singapore) for compute + a managed Postgres.

**Why deferred.** Migration is a one-time project that adds risk. We do it after the platform is feature-complete and stable. Doing it earlier means re-doing it when the architecture changes underneath us.

**Will be planned in detail when Stage 4 is complete.** Key decisions to defer until then: managed-Postgres vendor, whether to keep S3 (Wasabi or Backblaze B2 as alternatives), how to handle the cutover with zero data loss for live trackers.

---

## Cross-stage notes

- **No stage starts until the previous stage's exit criteria are met.** No mixing.
- **Each stage gets its own branch off `main`**, named `integration/stage-N-<short-name>`. Stage 0 branch is `integration/stage-0-setup`.
- **Production is touched only at well-defined points**: end of Stage 1 (schema migration), end of Stage 2 (ingestion deploy), end of Stage 3 (dashboard deploy), end of Stage 4 (hardened production launch). Stages 0 and 5 do not deploy to production.
- **The `gps_services` database name does not change across stages.** Schema inside it changes; the database itself remains the source of truth until Stage 5.
