# Local development setup

Bring up the Platform stack (Postgres + backend API + frontend) on a Mac in under ten minutes. Tested on macOS Sonoma with Postgres.app and Node 20.

## Prerequisites

| Tool | Tested version | Notes |
|---|---|---|
| Postgres | 16 (Postgres.app) | PostGIS bundled in Postgres.app. Postgres 14+ works. |
| Node | 20.19+ or 22.12+ | Vite 7 dev mode requires this. Older Node (e.g. 20.11) still runs `vite preview` but not `vite dev`. |
| psql, pg_ctl | on PATH | Postgres.app puts these at `/Applications/Postgres.app/Contents/Versions/latest/bin/` — add to `$PATH`. |

## One-time setup

### 1. Start Postgres

If using Postgres.app, open the app or run:

```
pg_ctl -D ~/Library/Application\ Support/Postgres/var-16/ -l /tmp/postgres-local.log start
```

Verify with `psql -h localhost -U postgres -l`.

### 2. Bootstrap the database

This is the canonical schema. It mirrors production after all migrations have been applied. **Re-run any time you want a clean local DB.**

```
dropdb -h localhost -U postgres realtimedb 2>/dev/null
createdb -h localhost -U postgres realtimedb
psql -h localhost -U postgres -d realtimedb -f scripts/local-bootstrap.sql
```

You should see `Local bootstrap complete | accounts: 1 | vehicles: 0 | devices: 1 | drivers: 0`.

The seed leaves you with:
- one `accounts` row (id=1, "Local Dev Co") so vehicle/device FKs resolve
- one `devices` row (terminal_id `000000000001`, status `IN_STOCK`) ready to assign in the onboarding flow

### 3. Configure backend env

Copy `.env.example`:

```
cd backend
cp .env.example .env
```

Make sure:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USERNAME=postgres`
- `DB_PASSWORD=localdev`  (any non-empty value works with Postgres.app's trust auth — empty fails the ormconfig validation)
- `DB_NAME=realtimedb`

### 4. Install dependencies

```
cd backend && npm install
cd ../frontend && npm install
```

## Daily workflow

### Run the backend

```
cd backend
npm start
```

API serves on `http://localhost:4000`. Routes include `/api/customers`, `/api/vehicles`, `/api/gateways`, `/api/drivers`, `/api/positions/latest`, etc.

### Run the frontend

```
cd frontend
npm run dev
```

Vite dev server on `http://localhost:5173`. The frontend reads `VITE_API_URL` from `.env.local`:

- **Talk to local backend**: omit `.env.local` (defaults to `http://localhost:4000/api`).
- **Talk to production backend**: set `VITE_API_URL=http://98.88.155.246:4000/api` in `frontend/.env.local`.

Bypass the login screen for dev work by pasting this into DevTools Console:

```js
const devUser = { userTY: "AD", userID: 1, compID: 1, userNM: "dev" };
const loginState = { userInfo: devUser, token: "dev-bypass", userPc: "", userID: 1, companyID: 1, loading: false, error: null };
localStorage.setItem("token", "dev-bypass");
localStorage.setItem("userTY", "AD");
localStorage.setItem("persist:root", JSON.stringify({
  user: JSON.stringify(loginState),
  login: JSON.stringify(loginState),
  _persist: JSON.stringify({ version: -1, rehydrated: true }),
}));
window.location.href = "/dashboard";
```

### Walk the onboarding flow

1. `/customers` → **Add Customer** → fill the form → submit. Modal shows the generated admin password.
2. Continue to the customer page → **Vehicles tab → Add Vehicle**.
3. **Gateways tab → Assign Gateway from Inventory** → pick the seeded `000000000001` device.
4. **Drivers tab → Add Driver** with the new vehicle pre-selected.
5. Use the **Edit** buttons on any row to update properties.

## Smoke test the API directly

```
curl -s -X POST http://localhost:4000/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"company_name":"Smoke Co","owner_name":"Smoke","email":"smoke@local","phone":"+0-0"}' \
  | jq
```

You should get back `customer`, `admin_user`, and a `generated_password` field.

## Run the test suite

```
cd backend
npx jest
```

Currently 111 cases across 15 suites: ingestion handlers + parsers (JS), API controllers (TS via ts-jest), event detection (TS).

Frontend has no test runner configured. Manual verification only for now.

## Resetting

If anything gets corrupted, the SQL bootstrap is idempotent if you drop+create the DB first. The whole "rebuild from scratch" sequence:

```
pkill -f 'ts-node src/index'   # stop backend
dropdb -h localhost -U postgres realtimedb
createdb -h localhost -U postgres realtimedb
psql -h localhost -U postgres -d realtimedb -f scripts/local-bootstrap.sql
cd backend && npm start
```

## Production reference

Production lives at:
- API: `http://98.88.155.246:4000`
- Ingestion: TCP `98.88.155.246:8003` (Mobicom JT/T 808 V2.2)
- Database: `gps_services` on the same EC2 host, postgres user, password in `/var/www/html/gps.geotrenza.com/api/.env`
- Both backends run under `pm2` (`geotrenza-api`, `geotrenza-ingestion`) per `/home/ubuntu/ecosystem.config.js`

ssh access via `ssh -i ~/.ssh/mailkey.pem ubuntu@98.88.155.246`.
