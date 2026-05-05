# Current Architecture (as of 2026-05-04)

This describes the truck-IoT system **as it runs today**, before any Stage 0+ changes land in production. It is the baseline we are migrating away from.

For a code-level audit (entities, data flow, dashboard wiring, what's hardcoded vs. real), see [`current-state.md`](./current-state.md). This document is about the **infrastructure** — servers, databases, network, domains, hardware.

---

## High-level shape

A single AWS EC2 instance runs both halves of the product **and** the database:

- The **frontend** (React/Vite dashboard) is served at `geotrenza.com`.
- The **ingestion service** (a Node TCP server that speaks JT/T 808) listens on the same EC2 at `gps.geotrenza.com:8003` for GPS trackers in the field.
- The **database** — PostgreSQL 16.13 with PostGIS 3.4.2 — runs **directly on the same EC2**, *not* on AWS RDS. Database name: `gps_services`. Data directory: `/var/lib/postgresql/16/main` on the EC2's 20 GB root volume (5 GB used, 15 GB free as of 2026-05-05).

There is **no AWS RDS instance** for this project. All compute, network ingestion, and persistent state are co-located on one `t2.medium` in `us-east-1`. (An earlier draft of this document mistakenly described the database as RDS-hosted; corrected 2026-05-05.)

```
                      ┌────────────────────────────────────────────────┐
                      │         AWS EC2 (t2.medium, us-east-1)         │
                      │                                                │
   browsers ──HTTPS──▶│  geotrenza.com  (frontend)                     │
                      │       └─── HTTP ──▶ Express                    │
                      │                     (backend API)              │
   G107 trackers ─TCP▶│  gps.geotrenza.com:8003                        │
   (over Airtel 4G)   │       (Node ingestion)                         │
                      │                                                │
                      │           │ local socket                       │
                      │           ▼                                    │
                      │  PostgreSQL 16.13 + PostGIS 3.4.2              │
                      │  /var/lib/postgresql/16/main                   │
                      │  database: gps_services                        │
                      │                                                │
                      └────────────────────────────────────────────────┘
                            (no AWS RDS — Postgres runs on the EC2)
```

---

## Compute

- **EC2 instance type:** `t2.medium` (2 vCPU, 4 GiB RAM, burstable). Single instance — no load balancer, no autoscaling, no second AZ.
- **Ingestion service deploy path:** `/var/www/html/gps.geotrenza.com/backend/index.js`. Runs as a long-lived Node process (process supervisor — pm2 / systemd / nohup — to be confirmed with the dev).
- **Frontend deploy path:** served from the same EC2 under the `geotrenza.com` document root (web server — nginx / Apache — to be confirmed).
- **Backend API deploy path:** the `platform/backend/` Express app. Where on the box and on which port — to be confirmed.

The ingestion service and the dashboard share the same machine and the same database. They are not currently isolated by container, network namespace, or user.

---

## Networking & domains

- `geotrenza.com` → HTTPS → frontend dashboard.
- `gps.geotrenza.com:8003` → raw TCP → ingestion service. The trackers do **not** speak HTTP; they speak the JT/T 808 binary protocol over a persistent TCP connection.
- The dashboard's HTTP API base URL inside the frontend code is currently `http://localhost:4000/api` (`platform/frontend/src/components/services/api.ts:4`). In production this gets reverse-proxied to whatever port the backend Express process is listening on. The exact reverse-proxy config — to be confirmed.

---

## Database

- **Engine:** PostgreSQL **16.13**, running **directly on the EC2** (Ubuntu 24.04). **Not AWS RDS.** There is no managed-database instance for this project.
- **Extensions:** **PostGIS 3.4.2** installed and active in `gps_services` (used for `geofences.geometry` in the v2 schema; see `schema-v2.md`).
- **Database name:** `gps_services`.
- **Data directory:** `/var/lib/postgresql/16/main` on the EC2's root EBS volume (20 GB total, 5 GB used, 15 GB free as of 2026-05-05).
- **Region:** the EC2 lives in `us-east-1` (Virginia, US East Coast). Trackers and customers are in India; this is a known latency/sovereignty issue, deferred to Stage 5.
- **Backups:** **NONE configured.** No `pg_dump` cron, no scheduled S3 dumps, no EBS snapshots. See "Known issues" #8 below — the database is one disk failure away from total data loss.
- **Schema management today:** the ingestion service runs with `synchronize: true` (`backend/ingestion/ormconfig.js:23`), which means TypeORM auto-creates and alters tables on every startup to match its entity classes. The platform backend runs with `synchronize: false` and was supposed to use migrations — but no migration files exist. So the actual production schema is whatever the ingestion's last startup produced, plus whatever was applied manually.

### Tables in production

12 tables (the original brief said "11" but listed 12; see *open questions* below):

| # | Table | Purpose | Defined by |
|---|---|---|---|
| 1 | `accounts` | Customer/company master records | platform `Account` entity |
| 2 | `users` | Login accounts (currently with plaintext passwords) | platform `User` entity |
| 3 | `employee` | Staff/driver master records | platform `Employee` entity (defined but not registered in ormconfig) |
| 4 | `allotments` | Truck-to-customer allocations (the platform code references this concept as `accounts_dtl`; production table is `allotments` — a mismatch) | platform `allocation` entity (currently maps to wrong table name) |
| 5 | `devices` | GPS device registry | both halves declare a `devices` entity with **different shapes** — see `current-state.md` §2 |
| 6 | `gps_data` | Raw GPS fixes from 0x0200 packets | ingestion `GpsData` entity |
| 7 | `gps_alarms` | One row per active alarm bit per packet | ingestion `GpsAlarm` entity |
| 8 | `gps_status` | One row per status check per packet (including "off" cases) | ingestion `GpsStatus` entity |
| 9 | `gps_extra_location` | Extra TLV fields parsed from 0x0200 location reports | ingestion `GpsExtraLocation` entity |
| 10 | `gps_extra_data_msg` | Wider TLV extras parser output | ingestion `GpsExtraDatamsg` entity |
| 11 | `heartbeats` | One row per 0x0002 heartbeat packet | ingestion `Heartbeat` entity |
| 12 | `command_reply` | 0x0300 command-reply payloads + 0x0900 transparent data | ingestion `CommandReply` entity |

There are **no foreign keys** between any of these tables. There are no shared identifier columns either — the dashboard side keys off `ID`/`userID`/`customerID`, the ingestion side keys off `terminalId`/`terminal_id`. Linking a GPS row back to a customer requires a lookup the platform doesn't currently know how to do.

**Tables that exist in code but not in the DB:**
- `trucks` — the platform's `Trucks` entity is registered, the dashboard's truck-list page calls `GET /api/trucks`, but no `trucks` table exists in production. This means the truck-list page either errors out, returns empty, or the table was created manually with some other shape — to be confirmed by inspecting RDS.
- The platform's `allocation` entity points at `accounts_dtl`, but the production table is named `allotments`. This either fails on every query or was renamed in code at some point — to be confirmed.

---

## Storage

- **S3:** at least one bucket associated with the EC2 instance. Purpose — to be confirmed with the dev. Likely candidates: tracker firmware uploads, frontend static asset hosting, RDS snapshots, log archive. Bucket names, ACLs, and lifecycle policies — all to be confirmed.

---

## Hardware in the field

- **Tracker model:** Mobicom G107.
- **Protocol:** JT/T 808 (the Chinese national standard for vehicle GPS terminals), with **Mobicom V2.2 vendor extensions**. The current `parseExtraMessages` parser handles many but not all of these extensions — see `current-state.md` for the field-name-mismatch bug and missing parsers.
- **Connectivity:** Airtel SIMs. Trackers open a long-lived TCP connection to `gps.geotrenza.com:8003` and stream packets.
- **Authorization:** trackers send a 0x0102 packet on first connect with their terminal ID and an auth code; ingestion writes that to the `devices` table (`backend/ingestion/index.js:54-65`). No verification of the auth code — any device that announces itself is accepted.

---

## Known issues to address in later stages

These are problems that exist in the system today. They are listed here to set the baseline; each one is the subject of one or more migration stages.

1. **Frontend shows hardcoded markers, not real data.** All three map pages (dashboard, live location, truck routes) render a fixed array of 2–7 Indian cities. No GPS data is fetched anywhere in the frontend. *Addressed in Stage 3.*
2. **Sensor data dropped due to field-name mismatch in parser.** `parseLocationExtra` returns `signalStrength` / `battery` / `speedExtra`; the writer reads `gsmSignal` / `batteryVoltage` / `extendedSpeed`. Those columns are silently `null` in every row. *Addressed in Stage 2.*
3. **`gps_status` logs non-events as events.** `parseStatus` emits `"ACC OFF"`, `"GPS Not Fixed"`, etc. as their own rows, so the table records every check, not just transitions. *Addressed in Stage 1 (schema redesign — events table) and Stage 2 (rewrite emitter).*
4. **No foreign keys between tables.** Customer/truck/device/GPS rows can't be safely joined; orphaned rows can accumulate without referential checks. *Addressed in Stage 1.*
5. **Plaintext passwords in `users` and `accounts` tables.** `User.password` is `varchar(50)` with no hashing in either the controller or the entity. *Addressed in Stage 4.*
6. **No auth middleware on API routes.** `platform/backend/src/index.ts:67-73` mounts every route group (`/api/users`, `/api/trucks`, `/api/devices`, `/api/customer`, `/api/allocation`) with no authentication check. Anyone reaching the API can call anything. *Addressed in Stage 3 (apply middleware) and Stage 4 (JWT in httpOnly cookies, helmet, rate limiting).*
7. **`trucks` and `allocation` entities exist in code but not as tables in production** (or the table exists under a different name). The dashboard's truck and allocation features can't be functioning end-to-end against the real DB. *Addressed in Stage 1.*
8. **NO DATABASE BACKUPS CONFIGURED.** Zero backup mechanisms exist as of 2026-05-05: no cron-based `pg_dump`, no scheduled S3 dumps, no EBS snapshots. The database is one disk failure away from total data loss. **CRITICAL Stage 4 priority.** Even before Stage 4, taking a manual `pg_dump -Fc gps_services` snapshot at each stage exit is recommended as a minimal mitigation. *Addressed in Stage 4.*

---

## Open questions

These are things the doc above could not pin down without inspecting the live infrastructure or asking the dev. Each will block or delay a later stage if not answered before that stage starts.

- How is the ingestion process supervised on the EC2? (pm2, systemd, nohup, screen?) Stage 4 needs to know to wire up a healthcheck and restart policy.
- What is the web server in front of the frontend, and where does the Express backend live (port, path, reverse-proxy rules)?
- What does the S3 bucket(s) hold? How many buckets, what names, what ACLs?
- Backup policy: NONE configured. Documented as Known Issue #8.
- Is the EC2 in a VPC with a security group restricting database access, or is Postgres listening on all interfaces?
- TLS termination for `geotrenza.com` — Let's Encrypt? AWS ACM via a load balancer? A self-signed cert?
- For `gps.geotrenza.com:8003`, are inbound trackers allowed unrestricted, or is there an IP allowlist? (Likely unrestricted; trackers roam on cellular IPs.)
