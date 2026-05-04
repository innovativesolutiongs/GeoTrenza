# Current State of the Truck-IoT System

This is a snapshot of how the two codebases in `~/truck-iot/` currently work and how (little) they connect to each other. Everything below is grounded in code that exists today, with file paths and line numbers as evidence.

A short glossary, since some of this is jargon-heavy:

- **Entity** — a class that describes one table in the database. The system uses a library called TypeORM that turns these classes into actual SQL tables.
- **Repository** — a TypeORM helper for reading and writing rows in one specific table.
- **Redux slice** — a chunk of front-end state (one for trucks, one for devices, etc.) that the React app reads from to render the screen.
- **Hex packet** — the GPS tracker hardware sends raw bytes over a TCP socket. We log them as a hexadecimal string, and the parser slices that string into fields.
- **JT/T 808** — the Chinese national standard for GPS tracker protocols. The G107 device speaks this. Message types are identified by a four-digit hex code (e.g. `0200` for a location report, `0002` for a heartbeat).

The two codebases:

- `~/truck-iot/platform/` — the **dashboard**. A TypeScript/Express HTTP API (`backend/`) plus a React/Redux/Vite UI (`frontend/`).
- `~/truck-iot/simulator/` — despite the folder name, this is the **real JT/T 808 ingestion service**. A plain Node/TCP server that listens for GPS trackers and writes their packets to Postgres. There is also a small `deviceSimulator.js` script in here, which is the only thing that's actually a simulator — it's a test client that opens a TCP socket and sends pre-baked hex packets.

---

## 1. Database connections

**Both halves use Postgres, but they connect to two different databases.**

### Platform backend
File: `platform/backend/src/ormconfig.ts`

- Reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` from environment variables (`ormconfig.ts:10-16`).
- Throws and refuses to start if any are missing (`ormconfig.ts:18-22`). No hardcoded fallback values.
- Builds a Postgres `DataSource` (`ormconfig.ts:24-36`). `synchronize: false` and `migrationsRun: false` — meaning TypeORM will **not** auto-create or modify tables on startup. Schema must be applied via migrations.

Actual env values (`platform/backend/.env:1-7`):

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<your local Postgres password>   ← placeholder, not a real password
DB_NAME=realtimedb
```

The `.env.example` (`platform/backend/.env.example:1-8`) is the same shape with empty password.

### Simulator (the real ingestion service)
File: `simulator/ormconfig.js`

- Also reads from environment variables, but with **different variable names** and **hardcoded fallbacks** (`ormconfig.js:18-22`):
  - `DB_HOST` → defaults to `"localhost"`
  - `DB_PORT` → defaults to `5432`
  - `DB_USER` (note: not `DB_USERNAME`) → defaults to `"postgres"`
  - `DB_PASSWORD` → defaults to `"12345"`
  - `DB_NAME` → defaults to `"gpstracker"`
- `synchronize: true` (`ormconfig.js:23`). On startup, TypeORM **automatically creates and alters tables** in the database to match the entity classes. No migrations.

Actual env values (`simulator/.env:1-7`):

```
TCP_PORT=808
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456     ← note: 6 digits, but the code's fallback is "12345" (5 digits)
DB_NAME=gpstracker
```

### Side-by-side comparison

| Setting | Platform backend | Simulator |
|---|---|---|
| Database type | Postgres | Postgres |
| Host / Port | `localhost:5432` | `localhost:5432` |
| Database name | **`realtimedb`** | **`gpstracker`** |
| User env var | `DB_USERNAME` | `DB_USER` |
| Password env var | `DB_PASSWORD` | `DB_PASSWORD` |
| Hardcoded fallbacks | **None** — throws if missing | **Yes** — host/port/user/password/db-name all have fallbacks |
| Schema management | Migrations only (`synchronize: false`) | Auto-sync on startup (`synchronize: true`) |
| Logging | `logging: true` | `logging: false` |

**Bottom line:** they connect to the same Postgres server, but to two separate databases, with two separate sets of tables, with no shared schema.

---

## 2. Schema overlap (entities)

### Platform entities
All in `platform/backend/src/entity/`. Five of the six are registered in `ormconfig.ts:31`. `Employee` is defined but **not registered**, so TypeORM ignores it.

| Class | Table | File |
|---|---|---|
| `User` | `users` | `entity/User.ts:3-4` |
| `Trucks` | `trucks` | `entity/truck.ts:3-4` |
| `Account` | `accounts` | `entity/account.ts:3-4` |
| `Devices` | `devices` | `entity/device.ts:4-5` |
| `allocation` | `accounts_dtl` | `entity/allocation.ts:3-4` |
| `Employee` | `employee` | `entity/employee.ts:3-4` (defined but not registered in `ormconfig.ts:31`) |

### Simulator entities
All in `simulator/entities/`. All eight are registered in `ormconfig.js:25`.

| Class | Table | File |
|---|---|---|
| `Device` | `devices` | `entities/Device.js:4-5` |
| `GpsData` | `gps_data` | `entities/GPS.js:4-5` |
| `Heartbeat` | `heartbeats` | `entities/Heartbeat.js:4-5` |
| `CommandReply` | `command_reply` | `entities/CommandReply.js:4-5` |
| `GpsAlarm` | `gps_alarms` | `entities/GpsAlarm.js:4-5` |
| `GpsStatus` | `gps_status` | `entities/GpsStatus.js:4-5` |
| `GpsExtraLocation` | `gps_extra_location` | `entities/GpsExtraLocation.js:5-7` |
| `GpsExtraDatamsg` | `gps_extra_data_msg` | `entities/GpsExtraDatamsg.js:5-6` |

### Name overlap

Only one entity name collides across the two codebases: **both define a "devices" table.** They are not the same shape:

| Column | Platform `devices` (`device.ts:6-25`) | Simulator `devices` (`Device.js:7-19`) |
|---|---|---|
| Primary key | `ID` `bigint`, auto-generated | `id` `int`, auto-generated |
| `srNO` | `integer`, default 0 | — |
| `title` | `integer`, default 0 (named "title", typed as a number) | — |
| `code` | `integer`, default 0 | — |
| `statusID` | `integer`, nullable | — |
| `userID` | `varchar(100)`, nullable (typed `number` in TS, but column is varchar) | — |
| `logID` | `timestamptz` | — |
| `terminalId` | — | `varchar`, nullable |
| `authCode` | — | `varchar`, nullable |

The two `devices` tables share only an auto-generated id column. **Every other column is different.** They live in different databases today (`realtimedb` vs `gpstracker`), so they don't actually clash. But if anyone ever pointed both processes at the same database, the simulator's `synchronize: true` (see §1) would either fail to start or rewrite the platform's `devices` table — neither outcome would be good.

No other entity names overlap. The platform's data model is a master-data model (trucks, customers, allocations, employees, users). The simulator's is a telemetry model (GPS fixes, alarms, status bits, heartbeats, extra sensor data).

---

## 3. Data flow trace: a 0x0200 location packet from a G107

A G107 device opens a TCP connection to the simulator's TCP server, then sends a hex packet whose 2nd byte is `0x02 0x00` — the JT/T 808 message ID for "location report." Here is what happens, function by function:

1. **TCP server accepts the connection.**
   `simulator/index.js:32` — `net.createServer((socket) => { ... })`. The server is listening on the port set by `TCP_PORT` (default `5000`, but the env file sets `808` — `simulator/.env:1`, `simulator/index.js:17`, `simulator/index.js:301`).

2. **The data event fires when the device sends bytes.**
   `simulator/index.js:36` — `socket.on("data", async (data) => { ... })`.

3. **Bytes are turned into a hex string and the message ID is sliced out.**
   `simulator/index.js:40-45` — `data.toString("hex").toUpperCase()`, then characters 2–6 are read as `messageId` and characters 10–22 as `terminalId`.

4. **The switch statement dispatches on message ID.**
   `simulator/index.js:50`. For `"0200"`, control enters the GPS branch at `simulator/index.js:83`.

5. **Parse the main GPS fields.**
   `simulator/index.js:85` — `const gps = parseLocation(hex)`, calling `simulator/utils/gpsParser.js:1-32`. That returns an object: `{ terminalId, alarm, status, latitude, longitude, altitude, speed, direction }` (latitude/longitude are integer-divided by 1,000,000 to convert from JT/T 808's millionths-of-a-degree format).

6. **Save the GPS row.**
   `simulator/index.js:92-99` — `gpsRepo.save({ terminalId, latitude, longitude, speed })` writes to the **`gps_data`** table. Note that `altitude` and `direction` are parsed but discarded; `alarm` and `status` are re-parsed below from raw hex.

7. **Speed > 100 → send an engine-lock command back down the socket.**
   `simulator/index.js:101-109` — builds a JT/T 808 command packet (`utils/commandBuilder.js`) and writes it back to the device. Nothing is recorded about this in the database.

8. **Parse and store alarm bits.**
   `simulator/index.js:114-126` — slices the alarm word out of the hex (`hex.substring(26,34)`), passes it to `simulator/utils/alarmParser.js:1-55`, which checks 28 individual bits (SOS, overspeed, fatigue, sensor faults, theft, rollover, …). For **each bit that is set**, the loop at `index.js:119-126` writes one row into **`gps_alarms`** (columns `terminal_id`, `alarm_type`).

9. **Parse and store status bits.**
   `simulator/index.js:133-145` — same shape, but on the status word. `simulator/utils/statusParser.js:1-37` decodes 11 status conditions. Note that `parseStatus` emits **both sides** of some flags (for bit 0 it pushes `"ACC ON"` if set or `"ACC OFF"` if not — `statusParser.js:5-6`). Each item, including the "off" cases, is then written as its own row into **`gps_status`**.

10. **Parse and store extra location TLV fields.**
    `simulator/index.js:152` — `parseLocationExtra(hex)` (`utils/locationExtraParser.js:1-60`) walks any trailing TLV (type-length-value) groups starting at hex offset 70. It recognizes IDs `01`–`06` (mileage, fuel, extra speed, signal strength, satellites, battery). Anything else is stored under `unknown_<id>`.
    `simulator/index.js:154-178` then writes one row to **`gps_extra_location`**.
    *Note:* there is a field-name mismatch between parser and writer. `locationExtraParser.js:32-42` emits keys like `signalStrength`, `battery`, `speedExtra`. The writer in `index.js:166-170` reads `extras.gsmSignal`, `extras.batteryVoltage`, `extras.extendedSpeed`. So the columns `signal_strength`, `battery_voltage`, `speed_ext` etc. will likely come out as `null` in this row, even when the device actually sent them.

11. **Parse and store the broader "extra messages" TLV set.**
    `simulator/index.js:185` — `parseExtraMessages(hex)` (`utils/extraMessageParser.js:1-110`) walks the same trailing region a second time, decoding a wider set of IDs (`01`, `02`, `04`, `2B`, `30`, `31`, `50`, `51`, `52`, `55`, `56`, `61`, `88`, `E1`-`E5`, `F9`).
    `simulator/index.js:187-211` writes one row to **`gps_extra_data_msg`** including a `message_id` column that the parser never sets, and `gnss_signal`/`raw_extra` columns that nothing populates.

12. **Send the JT/T 808 ACK back to the device.**
    `simulator/index.js:277-281` — `generateAck(hex)` (`utils/ackGenerator.js:1-17`) builds an `0x8001` general-response packet and writes it to the socket.

13. **The dashboard never sees any of it.**
    Searching the entire `platform/` codebase for `gps_data`, `gps_alarms`, `gps_status`, `gps_extra*`, `heartbeats`, `command_reply`, `terminalId`, or `terminal_id` returns **zero matches** (verified by grep across `*.ts`, `*.tsx`, `*.js` excluding `node_modules`). The data lands in Postgres `gpstracker.public.*` and stops there.

So: **on a healthy run, a 0x0200 packet writes 1 row to `gps_data`, plus 0–N rows to `gps_alarms`, plus 0–11 rows to `gps_status`, plus 1 row each to `gps_extra_location` and `gps_extra_data_msg`.** Then the dashboard ignores it all.

---

## 4. Dashboard data sources

The frontend is a React/Vite app. State lives in Redux (`platform/frontend/src/components/store/index.ts:16-25`) and is persisted via `redux-persist` to browser storage. Network calls go through axios with a base URL of `http://localhost:4000/api` (`frontend/src/components/services/api.ts:4-10`) — that's the platform backend, not the simulator.

The router (`frontend/src/components/routes/index.tsx:24-128`) defines the relevant pages. Below is what each page actually shows.

### Dashboard / "Live Map" — `frontend/src/components/dashbord/index.tsx`

- Stat-card numbers (Total Customers, Active Customers, Total Devices, Total Trucks, etc., `index.tsx:107-194`):
  - All come from **Redux state** (`index.tsx:13-22`), populated at mount by four async thunks:
    - `fetchDevices()` → `GET /api/devices` → `deviceController.getAllDevices` (`platform/backend/src/controllers/deviceController.ts:82-104`) → reads the `devices` table.
    - `fetchTrucks()` → `GET /api/trucks` → `truckController.getAllTrucks` (`backend/src/controllers/truckController.ts:74-99`) → reads the `trucks` table.
    - `fetchCustomers(compID)` → `GET /api/customer` route (out of scope of this trace).
    - `fetchCustomerAllocations(customerID)` → `GET /api/allocation/customer/:customerId` → `AccountsController.getByCustomer` (`backend/src/controllers/allocationController.ts:107-133`) → reads the `accounts_dtl` table.
  - All four endpoints hit the **platform's `realtimedb` database**. None of them touch any GPS table.

- Map markers (`dashbord/index.tsx:101-104`):
  ```js
  const markersData = [
    { id: 1, lat: 30.9010, lng: 75.8573, speed: 45 }, // Ludhiana
    { id: 2, lat: 30.8230, lng: 75.1730, speed: 60 }, // Moga
  ];
  ```
  These are **(b) hardcoded in the component**. Two fixed points in Punjab. They are passed straight to `<GoogleMapCluster markers={markersData} />` (`dashbord/index.tsx:205`) and rendered as Leaflet markers.
  - `dashbord/index.tsx:88-99` shows a commented-out earlier version that was trying to derive markers from `truck.lat`, `truck.lng`, `truck.gpsDateTime`, and `truck.speed` — but the `Trucks` entity has no `lat`, `lng`, `gpsDateTime`, or `speed` columns (`backend/src/entity/truck.ts:6-28`), so that code couldn't have worked even when uncommented.

- The `<GoogleMapCluster>` component itself (`frontend/src/components/dashbord/GoogleMapCluster.tsx:63-101`) is a generic Leaflet/OpenStreetMap renderer — it's actually OpenStreetMap, not Google Maps despite the name (`GoogleMapCluster.tsx:71-74`). It just renders whatever marker array it's handed.

### Live Location page — `frontend/src/components/Locations/livelocation.tsx`

- Customer dropdown options: `state.customers.items` (Redux), populated from the customers API.
- Truck dropdown options: filtered from `state.truck.trucks` and `state.allocation.items` in `livelocation.tsx:51-77` — derived from real Redux data.
- Map markers (`livelocation.tsx:9-17`): **hardcoded** array of 7 Indian cities (Delhi, Mumbai, Chennai, Kolkata, Jaipur, Bangalore, Hyderabad), passed straight to `<GoogleMapCluster markers={markersData} />` (`livelocation.tsx:122`).
- The customer and truck dropdowns have no effect on the map. There is no `useEffect` that recomputes markers when `selectedCustomer` or `filteredTrucks` change. The dropdowns sit on the page next to a static map of seven cities.

### Truck Routes page (the "route playback" screen) — `frontend/src/components/Locations/truckroutes.tsx`

- This file is **byte-for-byte identical** to `livelocation.tsx` except for the heading text ("Truck Routes" vs "Live Location") and one comment. Same hardcoded 7-city marker array (`truckroutes.tsx:9-17`), same dropdowns that don't affect the map, same call to `<GoogleMapCluster markers={markersData} />` (`truckroutes.tsx:122`). There is **no route playback** of any kind — no historical fetch, no polyline, no time slider.

### Truck list — `frontend/src/components/TruckMaster/index.tsx`

- Truck rows: from `state.truck.trucks` (Redux) → `fetchTrucks()` thunk → `GET /api/trucks` → `trucks` table. So **(a) fetched from a real API endpoint**.
- For non-admin users, the list is filtered to trucks whose `ID` appears in the customer's allocations (`TruckMaster/index.tsx:36-45`) — derived from Redux.
- The "Status" column always renders the literal string `"Active"` (`TruckMaster/index.tsx:173`) regardless of any actual status. **(b) Hardcoded in the component.**

### Summary table

| Page element | Source | Endpoint or location |
|---|---|---|
| Dashboard stat counts | API → Redux | `/api/devices`, `/api/trucks`, `/api/customer`, `/api/allocation/customer/:id` |
| Dashboard map markers | **Hardcoded** | `dashbord/index.tsx:101-104` — 2 fixed points in Punjab |
| Live Location dropdowns | API → Redux | same APIs as above |
| Live Location map markers | **Hardcoded** | `livelocation.tsx:9-17` — 7 fixed Indian cities |
| Truck Routes dropdowns | API → Redux | same APIs as above |
| Truck Routes map markers | **Hardcoded** | `truckroutes.tsx:9-17` — same 7 fixed cities |
| Truck list rows | API → Redux | `/api/trucks` |
| Truck list "Status" column | **Hardcoded** "Active" | `TruckMaster/index.tsx:173` |

**No frontend code path queries any GPS or telemetry data.**

---

## 5. Connection points between the two halves

There are essentially **none**. Concretely:

- **Different databases.** Platform uses `realtimedb`. Simulator uses `gpstracker`. (`platform/backend/.env:7`, `simulator/.env:7`.) Even sitting on the same Postgres server, the dashboard cannot see the simulator's tables without a cross-database query, and there are none.
- **No shared imports.** The platform is TypeScript with TypeORM decorators. The simulator is plain JavaScript with `EntitySchema`. They have no shared `package.json`, no shared module, nothing imported across the boundary.
- **No HTTP calls.** The simulator listens on a TCP socket and doesn't talk HTTP at all. The dashboard backend doesn't fetch from the simulator.
- **No grep hits in either direction.**
  - In `platform/`: zero matches for `gps_data`, `gps_alarms`, `gps_status`, `gps_extra_location`, `gps_extra_data_msg`, `heartbeats`, `command_reply`, `gpstracker`, `terminalId`, or `terminal_id`.
  - In `simulator/`: zero matches for `trucks`, `accounts`, `accounts_dtl`, `employee`, `realtimedb`.
- **The one near-overlap is the `devices` table name.** The platform's `Devices` entity (`platform/backend/src/entity/device.ts:4-5`) and the simulator's `Device` entity (`simulator/entities/Device.js:4-5`) both declare a table called `devices`. There is no plausible way a row written by one would be readable by the other (different columns, different databases, different primary key types), so this is a name collision rather than a real connection.

If the intent was for the dashboard to read tracker data from the simulator's tables, that wiring **does not exist in code yet.** No queries hit `gps_data`. The only place the dashboard might appear "connected" is the dashboard map — and as §4 documented, those markers are hardcoded.

---

## 6. What we verified vs. what we still need to ask

### Verified from code (with citations)

- Platform connects to Postgres `realtimedb` on `localhost:5432`, with strict env-var requirements and no fallbacks (`platform/backend/src/ormconfig.ts:10-36`, `.env:1-7`).
- Simulator connects to Postgres `gpstracker` on `localhost:5432`, with hardcoded fallbacks for every connection field, and uses different env-var names than the platform (`DB_USER` vs `DB_USERNAME`) (`simulator/ormconfig.js:16-26`, `.env:1-7`).
- Platform has `synchronize: false`; simulator has `synchronize: true` (`ormconfig.ts:34`, `ormconfig.js:23`).
- Five entities registered on the platform side; eight on the simulator side; `Employee` is defined but not registered (`platform/backend/src/ormconfig.ts:31`, `simulator/ormconfig.js:25`, `entity/employee.ts:3-4`).
- Both define a table called `devices` with completely different columns (`device.ts:4-26`, `Device.js:4-19`).
- A 0x0200 packet writes to `gps_data`, `gps_alarms`, `gps_status`, `gps_extra_location`, `gps_extra_data_msg` and triggers an ACK back to the device (`simulator/index.js:83-216, 277-281`).
- Speeding (>100) triggers an engine-lock command being written back to the socket (`simulator/index.js:101-109`).
- `parseLocationExtra` returns keys (`signalStrength`, `battery`, `speedExtra`) that don't match the keys the writer reads (`gsmSignal`, `batteryVoltage`, `extendedSpeed`) — extras-row writes will silently drop those fields (`utils/locationExtraParser.js:32-42` vs `index.js:166-170`).
- `parseStatus` emits explicit "off" labels (e.g. `"ACC OFF"`, `"GPS Not Fixed"`) and the writer stores them all, so `gps_status` accumulates a row per check, not just one per active flag (`utils/statusParser.js:5-19`, `index.js:138-145`).
- All dashboard maps render hardcoded marker arrays — Ludhiana/Moga on the dashboard, 7 Indian cities on the Live Location and Truck Routes pages (`dashbord/index.tsx:101-104`, `livelocation.tsx:9-17`, `truckroutes.tsx:9-17`).
- `livelocation.tsx` and `truckroutes.tsx` are duplicates of each other apart from heading text.
- The truck list's Status column is the string literal `"Active"` (`TruckMaster/index.tsx:173`).
- The dashboard's commented-out marker code expected `truck.lat`, `truck.lng`, `truck.gpsDateTime`, `truck.speed` — none of those columns exist on the `Trucks` entity (`dashbord/index.tsx:88-99` vs `entity/truck.ts:6-28`).
- Frontend talks only to `http://localhost:4000/api` (`services/api.ts:4-10`), which is the platform backend. There is no axios instance pointing at the simulator.
- No code in either repo references the other repo's tables (verified by grep).

### Still need to confirm with the developer or by inspecting a running database

- **Is there an actual production deployment that wires these together** (e.g. through a reverse proxy, a shared database, a separate sync job, or a step that's executed manually)? The repos have no glue.
- **Is the platform's `devices` table meant to be the same conceptual entity as the simulator's `Device`?** The platform's columns (`title`, `code`, `srNO` typed as integers) don't suggest a serial number / IMEI / terminal ID — but the dashboard does have a "Device Master" CRUD UI that talks about device numbers and names. Was the plan to map `Devices.code` ↔ `Device.terminalId`?
- **What does the `realtimedb` database actually contain right now?** The platform is `synchronize: false` and we did not find any migration files (`platform/backend/src/migration/` is referenced in `ormconfig.ts:32` but the directory wasn't present in the listing). The DB schema may have been created manually; we don't know if it matches the entities or if extra tables exist.
- **Is `gpstracker` actually running with the simulator's schema?** Since `synchronize: true` runs every startup, the schema is whatever the last simulator launch created — including any since-renamed columns. Worth dumping `\d gps_data` etc. against the live database.
- **Is `Employee` dead code or pending work?** It is defined (`entity/employee.ts:3-208`) but not registered (`ormconfig.ts:31`), and there is no employee controller or route.
- **Was the live-location page intended to subscribe to a real-time feed (websocket, polling)?** Right now it's static. Knowing the intent decides whether the fix is "wire it to the GPS table" vs. "build a streaming layer."
- **Why two `extras` parsers (`locationExtraParser` + `extraMessageParser`) running over the same hex region?** They overlap. Was one supposed to replace the other?
- **What is the simulator's `.env` password discrepancy?** File says `123456` (`simulator/.env:6`); code fallback says `12345` (`ormconfig.js:21`). If `.env` ever fails to load, the process silently uses the wrong password.
- **The simulator's `commandBuilder` / `serverdownlorddata` / `sendcommand` utilities exist** but no entry point calls them on a schedule. Is there a way for the dashboard to push a command down to a tracker today, or is that not built yet?
- **Is the `g107`-style `TERMINAL_ID = "690106149138"` in `deviceSimulator.js:7` representative of a real device ID format?** That would tell us whether the platform's plan was to store the terminal ID as a numeric string.

---

## Top 5 surprises

1. **The dashboard's "Live Map," "Live Location," and "Truck Routes" pages don't show any live data at all.** Every marker on every map is a hardcoded array of 2–7 Indian cities (`dashbord/index.tsx:101-104`, `livelocation.tsx:9-17`, `truckroutes.tsx:9-17`). The map components are real, the map tiles are real, but the dots are static test data.

2. **The two halves are completely disconnected.** They use different database names (`realtimedb` vs `gpstracker`), and a full grep across both repos finds **zero references** to the other half's tables. There is no code that joins the dashboard to the GPS ingestion. No sync job, no shared module, no API call across the boundary.

3. **Both codebases declare a `devices` table with completely different columns.** Platform's has `title`, `code`, `srNO`, `statusID`, `userID`, `logID` (administrative master data); simulator's has `terminalId` and `authCode` (what the actual GPS hardware sent during the auth handshake). Because they live in separate databases today, this hasn't blown up — but the simulator runs with `synchronize: true`, so if anyone ever pointed it at `realtimedb` it would try to drop and recreate the platform's `devices` table to match its own two-column shape.

4. **`livelocation.tsx` and `truckroutes.tsx` are the same file.** They differ only in two strings ("Live Location" vs "Truck Routes" in the heading and an inner card title). Same hardcoded markers, same Customer/Truck dropdowns that have no effect on the map, same component imported, same routing target. The "route playback" feature does not exist — there is no historical query, no path drawing, no time slider, just a static map of cities.

5. **The simulator silently drops half of the sensor data it parses.** `parseLocationExtra` returns keys like `signalStrength`, `battery`, and `speedExtra`, but the writer in `index.js:166-170` looks for `gsmSignal`, `batteryVoltage`, and `extendedSpeed`. The columns exist in the database, the parser runs, but the values never make it across — every `gps_extra_location` row has `null` for those fields even when the device sent them. Separately, `parseStatus` writes one row per status check (including the "off" cases), so `gps_status` records `"ACC OFF"` and `"GPS Not Fixed"` as if they were events, not just absent flags.

---

*Generated 2026-05-02 from a static read of the two codebases. No process was started, no database was queried; everything above is from the source files referenced in the citations.*
