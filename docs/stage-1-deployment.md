# Stage 1 deployment runbook

This is the step-by-step the on-call dev follows on the production EC2 to apply
the four Stage 1 migrations and bring the platform into the "Stage 1 → Stage 2
gap" state. Read it end-to-end before starting; do not skip the verification
steps.

**Migrations execute on the EC2 itself, not from a laptop.** The TypeORM CLI
needs the `node_modules` and the `.env` with the local Postgres credentials,
both of which live on the box. SSH in and run from there:

```bash
ssh ubuntu@98.88.155.246
```

All subsequent commands in this runbook run on the EC2 unless explicitly
stated otherwise.

## Production environment

- **EC2 host:** `98.88.155.246`
- **SSH user:** `ubuntu` (key-based; use the key you normally use for this box)
- **Database:** PostgreSQL 16.13 + PostGIS 3.4.2, running directly on the EC2;
  data dir `/var/lib/postgresql/16/main`. Database name: `gps_services`.
  See `architecture-current.md`.
- **Process supervisor:** **pm2** (used for both the legacy ingestion and the
  platform backend).

## Paths

- **Legacy ingestion** (the standalone JT/T 808 simulator that has been running
  since before the monorepo): `/var/www/html/gps.geotrenza.com/backend/`.
  **Stays in place during Stage 1 — we stop it but do not modify or delete it.**
  Stage 2 retires it.
- **Platform monorepo on EC2** (new, created during Stage 1):
  `/home/ubuntu/platform/`. Cloned in step 0.1. Holds the migration files
  (`backend/src/migration/`) and is the future home for the Stage 2 ingestion
  rewrite.
- **pg_dump destination:** `/tmp/stage-1-pre-migration-<timestamp>.dump`,
  immediately copied off-box.

## Where pm2 process names appear

Throughout this runbook you'll see `$INGESTION_PM2_NAME` and `$BACKEND_PM2_NAME`.
**These are placeholders.** Step 0.5 has you run `pm2 list` and record the real
names into shell variables; everywhere else just refers to them by variable.
**RUN `pm2 list` FIRST and substitute the actual process names** before running
any `pm2 stop` / `pm2 start` / `pm2 restart` lines.

---

## 0. Pre-flight (do all of these *before* touching anything)

### 0.1 Clone the monorepo and install backend dependencies

The Stage 1 migration files live in the monorepo at `backend/src/migration/`,
and the TypeORM CLI lives in `backend/node_modules/.bin/`. Both need to be on
the EC2 in a fresh location.

```bash
# Confirm the target directory does NOT already exist — we don't want to clobber
# an in-progress clone or someone else's experiment.
test -e /home/ubuntu/platform && \
  { echo "STOP: /home/ubuntu/platform already exists — investigate before continuing"; }

# Clone. Substitute the actual repo URL; confirm with the team if unsure.
git clone git@github.com:innovativesolutiongs/GeoTrenza.git /home/ubuntu/platform

cd /home/ubuntu/platform

# Make sure we're on the right branch and at the reviewed commit.
git checkout integration/stage-1-schema
git log --oneline -1
# Expected: HEAD SHA matches whatever was signed off in the Stage 1 review.
```

Install backend dependencies (~250 packages; takes ~15 s on a t2.medium):

```bash
cd /home/ubuntu/platform/backend
npm install
```

Verify the tooling is in place:

```bash
ls /home/ubuntu/platform/backend/node_modules/.bin/ | grep typeorm
# expect: typeorm, typeorm-ts-node-commonjs, typeorm-ts-node-esm

ls /home/ubuntu/platform/backend/src/migration/
# expect:
#   1777996800000-RenameLegacyTables.ts
#   1777996860000-CreateDevicesTrucksGeofences.ts
#   1777996920000-CreatePositionsEvents.ts
#   1777996980000-CleanUsersAddCustomerFK.ts
```

Create the backend's `.env` with the local Postgres credentials and the
gap-mode flag:

```bash
cat > /home/ubuntu/platform/backend/.env <<'EOF'
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=<postgres-user>
DB_PASSWORD=<postgres-password>
DB_NAME=gps_services
STAGE_1_GAP_MODE=true
EOF
chmod 600 /home/ubuntu/platform/backend/.env
```

Substitute the real Postgres credentials. Three places to find them, in
preferred order:

1. The dev who set up the box (ask first).
2. `/home/ubuntu/platform/backend/ingestion/.env` in the cloned monorepo —
   committed in Stage 0 Deliverable 1 when the ingestion service was moved
   into the monorepo. Same DB host / port / user / password / name.
3. `/var/www/html/gps.geotrenza.com/backend/`'s `ormconfig.js` on the EC2 —
   the legacy standalone ingestion connects to the same DB with the same
   credentials. Use this as the last-resort source-of-truth.

**`DB_PASSWORD` must be non-empty, even on a trust-auth local box.**
`backend/src/ormconfig.ts:18` guards the connection config with
`!DB_PASSWORD` (alongside the other four vars), which rejects an empty
string. If you're following this runbook on a local Postgres.app /
trust-auth setup for a dry-run instead of the production EC2 — the
connection at the socket level doesn't need a password, but the env
validation still does. Use a placeholder, e.g.:

```
DB_PASSWORD=local-trust-auth-no-password
```

Production unaffected — it has a real password.

After Stage 1, this checkout at `/home/ubuntu/platform/` stays in place.
Stage 2 reuses it for the new ingestion service.

### 0.2 Take a binary backup of the whole DB

There are no backups configured (Known Issue #8). This is the only rollback
path if both `npm run migration:revert` and your nerves give out. **Do not
skip.**

```bash
sudo -u postgres pg_dump -Fc gps_services \
  > /tmp/stage-1-pre-migration-$(date -u +%Y%m%dT%H%M%SZ).dump
ls -lh /tmp/stage-1-pre-migration-*.dump
```

Copy the dump off the EC2 immediately (S3, scp to an admin laptop, anywhere
that isn't this disk):

```bash
# example — replace with your destination
scp /tmp/stage-1-pre-migration-*.dump admin@offbox:/backups/
```

Confirm the file size is non-trivial (≥ a few MB; an empty dump is a sign that
the command silently failed).

### 0.3 Verify the case of users."ID"

Migration 4 references `"users"."ID"` and `"accounts"."ID"` (uppercase, quoted)
to match the existing entity classes. If production was somehow created with
lowercase `id`, Migration 4 will fail. Confirm before applying:

```bash
sudo -u postgres psql -d gps_services -c '\d users'    | head -30
sudo -u postgres psql -d gps_services -c '\d accounts' | head -10
```

Look for `"ID"` as the primary-key column (capital letters, quoted). If you
see lowercase `id`, **stop and escalate** — the migrations need adjusting.

### 0.4 Confirm row counts that the migrations depend on

```bash
sudo -u postgres psql -d gps_services <<'SQL'
-- Migration 4 requires that no users row has NULL customerID.
SELECT count(*) FROM users WHERE "customerID" IS NULL;
-- Should return 0. If non-zero, see schema-v2.md §"Migration strategy".

-- Migration 4 deletes exactly these three test rows.
SELECT "ID", "username", "customerID" FROM users WHERE "ID" IN (1, 4, 5);
-- Should return three rows: EZELDAdmin/1466, EZ/CS/006/6, EZ/CS/043/47.
-- If counts differ, stop and re-audit.
SQL
```

### 0.5 Verify nothing is currently running that needs stopping

The original draft of this section assumed both the legacy ingestion and
the platform backend were pm2-supervised. The dev confirmed on 2026-05-12
that this is **not** the case: the legacy ingestion was run via
`node index.js` in a foreground terminal session, pm2 was uninitialized
on the EC2 until today's diagnostic, and no node processes are currently
running. We still verify, because "currently running" can change between
sessions.

Two probes — both should return empty:

```bash
# Anything listening on the legacy ingestion port (JT/T 808, default 8003)?
sudo ss -tlnp | grep 8003
# expect: no output

# Any node processes at all?
ps aux | grep -E 'node|geotrenza' | grep -v grep
# expect: no output
```

If both come back empty, **skip §2 entirely** — there's nothing to stop —
and proceed to §1 to set up the dormant 503 placeholder for Stage 2.

If either probe finds something, that's a new process started since the
dev's last status update. Stop and investigate before §2 — the runbook's
old pm2-stop instructions no longer apply; see §2 for the foreground-node
kill path.

---

## 1. Enable the dashboard 503 placeholder (dormant during Stage 1)

**Reality check from §0.5.** The platform backend is *not* currently
running on this EC2 — there's no Express process bound to port 4000, no
pm2 entry, nothing serving `/api/*` from this box. (How the legacy
dashboard at `gps.geotrenza.com` is being served is a separate question;
for Stage 1 cutover purposes, all we need to know is that there's no
running backend here to swap into 503 mode.)

That means **the 503 middleware is dormant during Stage 1**, not active.
There are no incoming requests to reject because there's no running
backend to receive them. The configuration is still important — when
Stage 2 brings a real backend up from this checkout, `STAGE_1_GAP_MODE`
must already be set in `.env` so the first request after deploy lands on
the 503 path until Stage 2 has wired up the new endpoints.

All we do at this step is **confirm the flag is in place** so Stage 2
inherits the right preventive posture:

```bash
grep '^STAGE_1_GAP_MODE=' /home/ubuntu/platform/backend/.env
# expect: STAGE_1_GAP_MODE=true
```

If the line is missing or set to `false`, fix `.env` before continuing —
this is the one chance to set it without a "did the deploy already wake
the backend up?" race.

No backend restart needed at this stage. No `curl` health check applies
yet, because there's nothing answering on port 4000. The first time the
503 actually serves a response is the first request after the Stage 2
deploy lands — at which point the §6.4 disable procedure becomes the
relevant counterpart.

---

## 2. Stop the legacy ingestion service

**If §0.5 confirmed nothing is currently running, skip this section.**
The dev's last terminal session ended an unknown number of hours before
Stage 1 cutover and no node processes are running on the EC2 right now;
nothing to stop. Proceed straight to §3.

Otherwise — if §0.5 found a listener on port 8003 or a stray node
process — the most likely supervisor is a foreground terminal running
`node index.js` from `/var/www/html/gps.geotrenza.com/backend/` (the
legacy ingestion was never under pm2 on this EC2). Find the PID and
kill it directly:

```bash
# Find the owner of port 8003 (rerun of the §0.5 probe, with PID extracted)
sudo ss -tlnp | grep 8003
# example output: LISTEN 0 511 *:8003 *:* users:(("node",pid=12345,fd=20))

# Kill that PID
sudo kill <pid>

# Verify
sudo ss -tlnp | grep 8003                            # expect: no output
ps aux | grep -E 'node|geotrenza' | grep -v grep     # expect: no output
```

**Why direct kill rather than `pm2 stop`.** pm2 wasn't supervising the
legacy ingestion — it was a foreground `node index.js` in someone's
terminal. There is no pm2 entry to stop; `pm2 list` is empty on this
EC2 until today's diagnostic. If a future operator brings ingestion
back under pm2 between now and cutover, update this section before
running it.

**Why before migrating, not after.** While ingestion is running with
`synchronize: true`, even a brief restart will recreate the renamed
`gps_data` / `gps_alarms` / etc. tables (empty) and start writing to
them, which defeats the rename.

Trackers will accumulate packets at the cellular layer; when ingestion
comes back (Stage 2), they re-establish TCP and replay. Brief data gap
is expected and acceptable for Stage 1.

---

## 3. Apply all four migrations

```bash
cd /home/ubuntu/platform/backend
npm run migrate
```

`npm run migrate` runs `typeorm-ts-node-commonjs -d ./src/ormconfig.ts
migration:run`. All four migrations apply in sequence.

Expected output (abbreviated):

```
query: SELECT * FROM information_schema.tables ...
Migration "RenameLegacyTables1777996800000" has been executed successfully.
Migration "CreateDevicesTrucksGeofences1777996860000" has been executed successfully.
Migration "CreatePositionsEvents1777996920000" has been executed successfully.
Migration "CleanUsersAddCustomerFK1777996980000" has been executed successfully.
```

If any one fails, **the partial state is committed up to the last successful
migration** (TypeORM does not wrap them in a single outer transaction). Skip
to §6 (rollback) — try `npm run migration:revert` first; fall back to
`pg_restore` if revert can't fix it.

---

## 4. Verify schema state

### 4.1 Table list

```bash
sudo -u postgres psql -d gps_services -c '\dt'
```

Expect to see (alphabetically):

- `accounts` — unchanged
- `allotments` — unchanged
- `command_reply` — unchanged
- `devices` — **new shape** (Migration 2)
- `devices_legacy` — renamed v1 (Migration 1)
- `employee` — unchanged
- `events` — new (Migration 3)
- `geofences` — new (Migration 2)
- `gps_alarms_legacy` — renamed
- `gps_data_legacy` — renamed
- `gps_extra_data_msg_legacy` — renamed
- `gps_extra_location_legacy` — renamed
- `gps_status_legacy` — renamed
- `heartbeats_legacy` — renamed
- `migrations` — TypeORM bookkeeping (one row per applied migration)
- `positions` — new (Migration 3)
- `trucks` — new shape (Migration 2)
- `users` — unchanged shape, three rows fewer

If any v1 table name (`gps_data`, `gps_alarms`, …) shows up *without* a
`_legacy` companion, the rename did not take — stop and investigate.

### 4.2 Per-table inspection

```bash
sudo -u postgres psql -d gps_services <<'SQL'
\d trucks
\d devices
\d geofences
\d positions
\d events
SQL
```

For each, confirm:

- **trucks:** `id` bigserial PK, FK `trucks_account_id_fkey` to accounts,
  indexes `trucks_account_id_idx` and `trucks_account_id_registration_no_uidx`,
  trigger `trucks_set_updated_at`.
- **devices:** `id` bigserial PK, UNIQUE on `terminal_id`, CHECK
  `devices_terminal_id_format_check`, FKs to accounts (RESTRICT) and trucks
  (SET NULL), four secondary indexes, `devices_set_updated_at` trigger.
- **geofences:** `geometry` is type `geometry(Polygon,4326)`, FK to accounts
  CASCADE, GIST index `geofences_geometry_idx`, partial index
  `geofences_account_id_active_idx`, `geofences_set_updated_at` trigger.
- **positions:** typed columns + `telemetry jsonb`, CHECK
  `positions_telemetry_size_check`, FK `positions_device_id_fkey` to devices
  RESTRICT, two indexes (`positions_device_id_recorded_at_idx`,
  `positions_recorded_at_idx`).
- **events:** typed columns + `payload jsonb`, CHECK
  `events_payload_size_check`, FK to devices RESTRICT, FK to positions
  SET NULL, four indexes including the partial `events_active_alarms_idx`.

### 4.3 FK on users.customerID

```bash
sudo -u postgres psql -d gps_services -c '\d users' | grep -E 'customerID|fkey'
```

Expect: `customerID` shown as `NOT NULL`, plus a constraint line referencing
`users_customerid_fkey` → `accounts("ID")`.

```bash
sudo -u postgres psql -d gps_services -c \
  'SELECT count(*) FROM users WHERE "ID" IN (1, 4, 5);'
# expect: 0
```

### 4.4 PostGIS sanity

```bash
sudo -u postgres psql -d gps_services -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';"
# expect: postgis | 3.4.2
```

If PostGIS isn't listed, the geofences table creation should have failed —
go to rollback.

---

## 5. Hold (Stage 1 → Stage 2 gap)

At this point the schema is migrated. **Do not restart the legacy ingestion
service.** Its `synchronize: true` would recreate the `gps_data`/`gps_alarms`
/etc. tables (empty) alongside the `*_legacy` ones, and start writing to the
empties, which defeats the rename.

What stays in this state until Stage 2:

- Ingestion service: **stopped** (`pm2 list` shows `$INGESTION_PM2_NAME` in
  status `stopped`). Trackers buffer at the cellular layer.
- `STAGE_1_GAP_MODE`: **true**. Dashboard returns 503 on the three affected
  endpoints.
- New tables (`positions`, `events`, `trucks`, `devices`, `geofences`): empty,
  waiting for Stage 2 to write to them.
- `*_legacy` tables: kept for 30 days, dropped at Stage 2 close-out.
- Cloned monorepo at `/home/ubuntu/platform/`: stays in place; Stage 2 reuses
  this checkout for the new ingestion service.

Other dashboard endpoints (`/api/users`, `/api/customer`, change-password,
employee, the auth flow) keep working — they hit `accounts`/`users`/`employee`
which weren't touched.

---

## 6. Rollback procedure (if anything goes wrong)

The first cut is to use the migrations' own `down()` methods via
`npm run migration:revert`. Each invocation reverts the **most recent**
applied migration; we need four invocations to fully unwind Stage 1.

### 6.1 Try `migration:revert` four times, in reverse order

```bash
cd /home/ubuntu/platform/backend
npm run migration:revert    # reverts Migration 4 — CleanUsersAddCustomerFK
npm run migration:revert    # reverts Migration 3 — CreatePositionsEvents
npm run migration:revert    # reverts Migration 2 — CreateDevicesTrucksGeofences
npm run migration:revert    # reverts Migration 1 — RenameLegacyTables
```

Each invocation should print:

```
Migration "<name><timestamp>" has been reverted successfully.
```

**Caveat for Migration 4's down() — asymmetric by design.** The revert
drops the FK and the `NOT NULL` on `users.customerID`, but it **cannot
restore the deleted test users (`ID = 1, 4, 5`)**. The rows are gone
from the live table; TypeORM's revert path has no way to recover them.
If you need them back for any reason, fall through to §6.2 (`pg_restore`
from the pre-migration dump taken in §0.2). In practice you almost
certainly don't — those three rows were confirmed test data before
Stage 1 — but a future operator running `migration:revert` should know
before they hit it, rather than discover after the fact.

After the four reverts, verify:

```bash
sudo -u postgres psql -d gps_services -c '\dt'
# expect: original 12-table v1 set, no *_legacy, no positions/events/geofences/new-trucks.
sudo -u postgres psql -d gps_services -c '\d users' | grep -E 'customerID|fkey'
# expect: no users_customerid_fkey constraint, customerID nullable.
```

If the schema is back to v1 and you don't need the deleted rows, jump to 6.3.

### 6.2 Last resort — restore from the pg_dump

Use this path if any `migration:revert` call failed, or if you need the
deleted users rows back, or if the post-revert verification looks wrong.

1. Stop the platform backend (so it doesn't reconnect during the swap):

   ```bash
   pm2 stop $BACKEND_PM2_NAME
   ```

2. Drop and recreate the database, then restore from the dump from §0.2:

   ```bash
   sudo -u postgres dropdb   gps_services
   sudo -u postgres createdb gps_services
   sudo -u postgres pg_restore -d gps_services \
       /tmp/stage-1-pre-migration-<timestamp>.dump
   ```

   `pg_restore` exits non-zero if anything fails. If it does, **escalate** —
   partial restores are worse than no restore.

3. Confirm the schema is back to v1:

   ```bash
   sudo -u postgres psql -d gps_services -c '\dt'
   # expect the 12-table v1 set, no *_legacy, no new tables.
   ```

### 6.3 Restart the legacy ingestion service

```bash
pm2 start $INGESTION_PM2_NAME
pm2 list                       # confirm status "online"
```

### 6.4 Disable the dashboard gap

```bash
sed -i '/^STAGE_1_GAP_MODE=/d' /home/ubuntu/platform/backend/.env
pm2 restart $BACKEND_PM2_NAME --update-env
# (if you used Case B in §1, edit and restart whichever .env you actually changed)
curl -i http://localhost:4000/api/trucks
# expect: 200 (or whatever the v1 controller returned before).
```

### 6.5 Confirm and debrief

Confirm the dashboard works against the v1 schema, then debrief on what went
wrong before re-attempting Stage 1. The cloned monorepo at
`/home/ubuntu/platform/` can be left in place for the next attempt.

---

## STAGE_1_GAP_MODE env var

`STAGE_1_GAP_MODE` controls whether the platform backend's
`/api/trucks`, `/api/devices`, and `/api/allocation` routes return their
normal response or a placeholder 503.

- **`STAGE_1_GAP_MODE=true`** — those three routes return:
  ```
  HTTP/1.1 503 Service Unavailable
  {"error":"Service temporarily unavailable during schema migration",
   "expected_recovery":"Stage 2 deployment"}
  ```
  Other routes (auth, users, customer, employee, change-password) are
  unaffected.

- **unset / `STAGE_1_GAP_MODE=false`** — normal route handlers run.

Lifecycle:

| moment | desired value |
|---|---|
| before Stage 1 cutover begins | `true` (set in §0.1's `.env`, picked up at §1's restart) |
| during the Stage 1 → Stage 2 gap | `true` (stays on) |
| after Stage 2 deploys and the dashboard is rewired against the new tables | unset / `false` (turn off as part of Stage 2 cutover) |

Implemented in `/home/ubuntu/platform/backend/src/index.ts` as a small
early-return middleware mounted before the affected routers.
