# Stage 1 deployment runbook

This is the step-by-step the on-call dev follows on the EC2 to apply the four
Stage 1 migrations and bring the platform into the "Stage 1 → Stage 2 gap"
state. Read it end-to-end before starting; do not skip the verification steps.

**Prerequisites:** SSH access to the EC2, sudo, and `psql` available locally
on the box (Postgres runs on the same host — see `architecture-current.md`).

**Locations:**
- Platform monorepo on the EC2: `<path-to-Platform>` (confirm during pre-flight).
- Ingestion service entrypoint (legacy): `/var/www/html/gps.geotrenza.com/backend/index.js`.
- Database: local Postgres 16 on this EC2; data dir `/var/lib/postgresql/16/main`.

---

## 0. Pre-flight (do all of these *before* touching anything)

### 0.1 Take a binary backup of the whole DB

There are no backups configured (Known Issue #8). This is the only rollback
path if anything goes sideways. **Do not skip.**

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

Confirm size is non-trivial (≥ a few MB; an empty dump is a sign that the
command silently failed).

### 0.2 Verify the case of users."ID"

Migration 4 references `"users"."ID"` and `"accounts"."ID"` (uppercase, quoted)
to match the existing entity classes. If production was somehow created with
lowercase `id`, Migration 4 will fail. Confirm before applying:

```bash
sudo -u postgres psql -d gps_services -c '\d users'   | head -30
sudo -u postgres psql -d gps_services -c '\d accounts' | head -10
```

Look for `"ID"` as the primary-key column (capital letters, with quotes in
TypeORM-generated DDL). If you see lowercase `id`, **stop and escalate** —
the migrations need adjusting.

### 0.3 Confirm row counts that the migrations depend on

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

### 0.4 Identify the ingestion process supervisor

We need to stop the legacy ingestion before migrating, and we must not
restart it afterwards. First find out how it's running:

```bash
ps -ef | grep -E 'node.*gps.geotrenza|ingest' | grep -v grep
pm2 list 2>/dev/null
systemctl list-units --type=service --no-pager | grep -iE 'ingest|geotrenza' || true
```

Whichever of those produces output is your supervisor. **Record the exact
service name** — you need it for steps 2 and 7.

### 0.5 Verify migration files are in place

```bash
ls <path-to-Platform>/backend/src/migration/
# expect:
#   1777996800000-RenameLegacyTables.ts
#   1777996860000-CreateDevicesTrucksGeofences.ts
#   1777996920000-CreatePositionsEvents.ts
#   1777996980000-CleanUsersAddCustomerFK.ts
```

If `node_modules` is missing in `backend/`, run `npm install` first.

---

## 1. Enable the dashboard 503 placeholder

Set `STAGE_1_GAP_MODE=true` in the platform backend's environment, then
restart the backend. This makes `/api/trucks`, `/api/devices`, and
`/api/allocation` return HTTP 503 instead of querying the about-to-change
tables. See §"STAGE_1_GAP_MODE env var" below.

```bash
# add to backend's .env (or systemd EnvironmentFile, depending on supervisor)
echo 'STAGE_1_GAP_MODE=true' >> <path-to-Platform>/backend/.env

# restart backend so it picks up the new env (command depends on supervisor)
# pm2:     pm2 restart platform-backend
# systemd: sudo systemctl restart <backend-service-name>
```

Verify the gap is active:

```bash
curl -i http://localhost:4000/api/trucks
# expect: HTTP/1.1 503 Service Unavailable
# body:   {"error":"Service temporarily unavailable during schema migration", ...}
```

If you get 200 or 404, gap mode is not active — fix that before proceeding.

---

## 2. Stop the ingestion service

**Do this before migrating, not after.** While ingestion is running with
`synchronize: true`, even a brief restart will recreate the renamed
`gps_data` / `gps_alarms` / etc. tables (empty) and start writing to them,
which defeats the rename.

```bash
# pm2:
pm2 stop <ingestion-process-name>

# systemd:
sudo systemctl stop <ingestion-service-name>

# nohup / screen:
# kill the PID you found in step 0.4
```

Verify it stopped:

```bash
ps -ef | grep -E 'node.*gps.geotrenza|ingest' | grep -v grep
# expect: no rows
```

Trackers will accumulate packets at the cellular layer; when ingestion
comes back (Stage 2), they re-establish TCP and replay. Brief data gap is
expected and acceptable for Stage 1.

---

## 3. Apply all four migrations

```bash
cd <path-to-Platform>/backend
npm run migrate
```

`npm run migrate` runs `typeorm-ts-node-commonjs -d ./src/ormconfig.ts
migration:run`. All four migrations apply in a single TypeORM transaction
batch.

Expected output (abbreviated):

```
query: SELECT * FROM information_schema.tables ...
Migration "RenameLegacyTables1777996800000" has been executed successfully.
Migration "CreateDevicesTrucksGeofences1777996860000" has been executed successfully.
Migration "CreatePositionsEvents1777996920000" has been executed successfully.
Migration "CleanUsersAddCustomerFK1777996980000" has been executed successfully.
```

If any one fails, **the partial state is committed up to the last
successful migration** (TypeORM does not wrap them in a single transaction).
Skip to §6 (rollback) and restore from the pg_dump.

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

- **trucks:** `id` bigserial PK, FK `trucks_account_id_fkey` to accounts, indexes `trucks_account_id_idx` and `trucks_account_id_registration_no_uidx`, trigger `trucks_set_updated_at`.
- **devices:** `id` bigserial PK, UNIQUE on `terminal_id`, CHECK `devices_terminal_id_format_check`, FKs to accounts (RESTRICT) and trucks (SET NULL), four secondary indexes, `devices_set_updated_at` trigger.
- **geofences:** `geometry` is type `geometry(Polygon,4326)`, FK to accounts CASCADE, GIST index `geofences_geometry_idx`, partial index `geofences_account_id_active_idx`, `geofences_set_updated_at` trigger.
- **positions:** typed columns + `telemetry jsonb`, CHECK `positions_telemetry_size_check`, FK `positions_device_id_fkey` to devices RESTRICT, two indexes (`positions_device_id_recorded_at_idx`, `positions_recorded_at_idx`).
- **events:** typed columns + `payload jsonb`, CHECK `events_payload_size_check`, FK to devices RESTRICT, FK to positions SET NULL, four indexes including the partial `events_active_alarms_idx`.

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

- Ingestion service: **stopped**. Trackers buffer at the cellular layer.
- `STAGE_1_GAP_MODE`: **true**. Dashboard returns 503 on the three affected endpoints.
- New tables (`positions`, `events`, `trucks`, `devices`, `geofences`):
  empty, waiting for Stage 2 to write to them.
- `*_legacy` tables: kept for 30 days, dropped at Stage 2 close-out.

Other dashboard endpoints (`/api/users`, `/api/customer`, change-password,
employee, the auth flow) keep working — they hit `accounts`/`users`/`employee`
which weren't touched.

---

## 6. Rollback procedure (if anything goes wrong)

If a migration fails partway, or post-migration verification reveals a
problem the migration's `down()` cannot fix, take the cautious path: restore
from the pg_dump.

1. Stop the platform backend.

   ```bash
   # pm2 / systemd, whichever applies
   pm2 stop platform-backend          # or
   sudo systemctl stop <backend-svc>
   ```

2. Drop and recreate the database, then restore.

   ```bash
   sudo -u postgres dropdb   gps_services
   sudo -u postgres createdb gps_services
   sudo -u postgres pg_restore -d gps_services \
       /tmp/stage-1-pre-migration-<timestamp>.dump
   ```

   `pg_restore` exits non-zero if anything fails. If it does, escalate before
   trying again — partial restores are worse than no restore.

3. Confirm the schema is back to v1.

   ```bash
   sudo -u postgres psql -d gps_services -c '\dt'
   # expect the 12-table v1 set, no *_legacy, no positions/events/geofences
   ```

4. Restart the legacy ingestion service.

   ```bash
   pm2 start <ingestion-process-name>          # or
   sudo systemctl start <ingestion-service>
   ```

5. Disable the dashboard gap.

   ```bash
   # remove or set to false in backend's .env
   sed -i '/^STAGE_1_GAP_MODE=/d' <path-to-Platform>/backend/.env
   pm2 restart platform-backend                 # or systemd equivalent
   ```

6. Confirm the dashboard works against the v1 schema, then debrief on what
   went wrong before re-attempting Stage 1.

---

## STAGE_1_GAP_MODE env var

`STAGE_1_GAP_MODE` controls whether the platform backend's
`/api/trucks`, `/api/devices`, and `/api/allocation` routes return their
normal response or a placeholder 503.

- **`STAGE_1_GAP_MODE=true`** — those three routes return:
  ```json
  HTTP/1.1 503 Service Unavailable
  {"error":"Service temporarily unavailable during schema migration",
   "expected_recovery":"Stage 2 deployment"}
  ```
  Other routes (auth, users, customer, employee, change-password) are unaffected.

- **unset / `STAGE_1_GAP_MODE=false`** — normal route handlers run.

Lifecycle:

| moment | desired value |
|---|---|
| before Stage 1 cutover begins | `true` (set in §1 above) |
| during the Stage 1 → Stage 2 gap | `true` (stays on) |
| after Stage 2 deploys and dashboard is rewired against the new tables | unset / `false` (turn off as part of Stage 2 cutover) |

Implemented in `platform/backend/src/index.ts` as a small early-return
middleware mounted before the affected routers.
