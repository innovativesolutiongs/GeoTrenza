-- ============================================================
-- Local dev bootstrap for realtimedb.
-- Creates the full schema matching production (post Stage 3e),
-- plus seed rows so the dashboard renders something on first
-- load. Idempotent: drops + recreates everything.
--
-- Usage:
--   dropdb -h localhost -U postgres realtimedb 2>/dev/null
--   createdb -h localhost -U postgres realtimedb
--   psql -h localhost -U postgres -d realtimedb -f scripts/local-bootstrap.sql
--
-- See docs/local-dev-setup.md for full setup instructions.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------- shared trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------- accounts ----------
-- Stage 3e cleanup: legacy v1 columns are made nullable in production via
-- migration 1779500000000. Local schema mirrors that — only the modern
-- Stage 3e columns are NOT NULL.
CREATE TABLE accounts (
  "ID"                  bigserial PRIMARY KEY,
  -- Stage 3e onboarding fields:
  email                 varchar(255),
  phone                 varchar(50),
  owner_name            varchar(120),
  company_name          varchar(255),
  title                 text,
  pricing_tier          varchar(32) NOT NULL DEFAULT 'Basic',
  billing_email         varchar(255),
  billing_contact_name  varchar(120),
  address_line1         varchar(255),
  address_line2         varchar(255),
  city                  varchar(120),
  state                 varchar(120),
  postal_code           varchar(20),
  country               varchar(120),
  deleted_at            timestamptz,
  -- Legacy v1 columns (kept nullable; will be dropped in a future stage):
  "refID"               integer,
  code                  varchar(20),
  "dotNo"               varchar(15),
  "mcNo"                varchar(15),
  address               varchar(200),
  "stateName"           integer,
  "cityName"            integer,
  "zipCode"             integer,
  "shpAddress"          varchar(200),
  "shpStateName"        integer,
  "shpCityName"         integer,
  "shpZipCode"          integer,
  "phoneNo"             varchar(30),
  "emailID"             text,
  "nemailID"            text,
  "firstName"           varchar(200),
  "lastName"            varchar(120),
  "dlNo"                varchar(50),
  "totT"                smallint,
  "totD"                smallint,
  "totS"                smallint,
  "batchID"             integer,
  username              varchar(255),
  userpass              varchar(255),
  "teamID"              varchar(50),
  "assignTo"            varchar(10),
  "planID"              smallint,
  "elogID"              smallint,
  "elogKey"             text,
  "chkConfim"           smallint,
  "appActiveID"         smallint,
  "wapActiveID"         smallint,
  "mayaPlanID"          smallint,
  "planTypeID"          smallint,
  "rowID"               integer,
  "imageFile"           text,
  "userID"              integer,
  "companyID"           integer,
  "statusID"            smallint NOT NULL DEFAULT 1,
  "logID"               timestamp,
  CONSTRAINT accounts_pricing_tier_check CHECK (pricing_tier IN ('Basic','Pro','Enterprise'))
);
CREATE UNIQUE INDEX accounts_email_uidx ON accounts (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX accounts_deleted_at_idx ON accounts (deleted_at) WHERE deleted_at IS NULL;

-- ---------- users ----------
CREATE TABLE users (
  "ID"             bigserial PRIMARY KEY,
  "customerID"     integer NOT NULL DEFAULT 0,
  "companyID"     integer DEFAULT 0,
  "staffID"        integer DEFAULT 0,
  "etypeID"        smallint DEFAULT 1,
  "uroleID"        integer DEFAULT 0,
  "suroleID"       integer DEFAULT 0,
  "empID"          integer DEFAULT 0,
  username         varchar(20),
  fname            varchar(30),
  lname            varchar(30),
  email            varchar(255),
  mobileno         text,
  password         varchar(50),
  pstexts          text,
  "userTY"         varchar(5),
  "tokenAN"        text,
  "tokenAP"        text,
  "fcmID"          text,
  "chkSupv"        smallint DEFAULT 0,
  "Available"      smallint,
  is_online        smallint DEFAULT 0,
  extension        smallint DEFAULT 0,
  telnyx_user_id   text,
  telnyx_conn_id   varchar(45),
  "logID"          timestamp,
  "isActive"       boolean DEFAULT true,
  password_hash    varchar(255),
  role             varchar(32),
  last_login_at    timestamptz,
  deleted_at       timestamptz,
  CONSTRAINT users_role_check CHECK (role IS NULL OR role IN ('GEOTRENZA_ADMIN','CUSTOMER_ADMIN'))
);
CREATE INDEX users_deleted_at_idx ON users (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_email_uidx ON users (LOWER(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;

-- ---------- vehicles ----------
CREATE TABLE vehicles (
  id               bigserial PRIMARY KEY,
  account_id       bigint NOT NULL REFERENCES accounts("ID") ON DELETE RESTRICT,
  registration_no  text NOT NULL,
  name             text,
  year             integer,
  make             varchar(64),
  model            text,
  manufacturer     varchar(64),
  vin              text,
  vehicle_type     varchar(32) NOT NULL DEFAULT 'Truck',
  metadata         jsonb,
  status           text NOT NULL DEFAULT 'active',
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('Truck','Trailer','Car','Van','Bus','Generator','Container','Heavy Equipment','Other'))
);
CREATE INDEX vehicles_account_id_idx ON vehicles (account_id);
CREATE UNIQUE INDEX vehicles_account_id_registration_no_uidx ON vehicles (account_id, registration_no);
CREATE INDEX vehicles_deleted_at_idx ON vehicles (deleted_at) WHERE deleted_at IS NULL;
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- devices ----------
CREATE TABLE devices (
  id                bigserial PRIMARY KEY,
  terminal_id       text NOT NULL UNIQUE,
  imei              text,
  account_id        bigint REFERENCES accounts("ID") ON DELETE RESTRICT,
  vehicle_id        bigint REFERENCES vehicles(id) ON DELETE SET NULL,
  auth_code         text,
  firmware_version  text,
  model             text DEFAULT 'G107',
  device_type       varchar(32) NOT NULL DEFAULT 'WIRED',
  inventory_status  varchar(32) NOT NULL DEFAULT 'IN_STOCK',
  last_seen_at      timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devices_terminal_id_format_check CHECK (terminal_id ~ '^[0-9]{12}$'),
  CONSTRAINT devices_device_type_check CHECK (device_type IN ('WIRED','MAGNETIC_BATTERY','ASSET_TRACKER')),
  CONSTRAINT devices_inventory_status_check CHECK (inventory_status IN ('IN_STOCK','ASSIGNED','ACTIVE','INACTIVE','RETURNED','DECOMMISSIONED'))
);
CREATE INDEX devices_account_id_idx ON devices (account_id);
CREATE INDEX devices_vehicle_id_idx ON devices (vehicle_id);
CREATE INDEX devices_imei_idx ON devices (imei);
CREATE INDEX devices_last_seen_at_idx ON devices (last_seen_at);
CREATE INDEX devices_device_type_idx ON devices (device_type);
CREATE INDEX devices_inventory_status_idx ON devices (inventory_status);
CREATE INDEX devices_deleted_at_idx ON devices (deleted_at) WHERE deleted_at IS NULL;
CREATE TRIGGER devices_set_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- drivers ----------
CREATE TABLE drivers (
  id              bigserial PRIMARY KEY,
  account_id      bigint NOT NULL REFERENCES accounts("ID") ON DELETE RESTRICT,
  name            varchar(120) NOT NULL,
  phone           varchar(50),
  email           varchar(255),
  license_number  varchar(64),
  license_expiry  date,
  hire_date       date,
  vehicle_id      bigint REFERENCES vehicles(id) ON DELETE SET NULL,
  status          varchar(16) NOT NULL DEFAULT 'ACTIVE',
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drivers_status_check CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX drivers_account_id_idx ON drivers (account_id);
CREATE INDEX drivers_vehicle_id_idx ON drivers (vehicle_id);
CREATE INDEX drivers_deleted_at_idx ON drivers (deleted_at) WHERE deleted_at IS NULL;
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- positions ----------
CREATE TABLE positions (
  id              bigserial PRIMARY KEY,
  device_id       bigint NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  recorded_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  speed_kph       real,
  heading_deg     smallint,
  altitude_m      integer,
  satellites      smallint,
  signal_strength smallint,
  battery_voltage real,
  mileage_m       integer,
  telemetry       jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT positions_telemetry_size_check CHECK (octet_length(telemetry::text) < 8192)
);
CREATE INDEX positions_device_id_recorded_at_idx ON positions (device_id, recorded_at DESC);
CREATE INDEX positions_recorded_at_idx ON positions (recorded_at DESC);

-- ---------- events ----------
CREATE TABLE events (
  id          bigserial PRIMARY KEY,
  device_id   bigint NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  position_id bigint REFERENCES positions(id) ON DELETE SET NULL,
  kind        text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_payload_size_check CHECK (octet_length(payload::text) < 8192)
);
CREATE INDEX events_device_id_started_at_idx ON events (device_id, started_at DESC);
CREATE INDEX events_started_at_idx ON events (started_at DESC);
CREATE INDEX events_active_alarms_idx ON events (device_id) WHERE ended_at IS NULL;
CREATE INDEX events_kind_started_at_idx ON events (kind, started_at DESC);

-- ---------- geofences ----------
CREATE TABLE geofences (
  id               bigserial PRIMARY KEY,
  account_id       bigint NOT NULL REFERENCES accounts("ID") ON DELETE CASCADE,
  name             text NOT NULL,
  geometry         geometry(POLYGON, 4326) NOT NULL,
  trigger_on_enter boolean NOT NULL DEFAULT true,
  trigger_on_exit  boolean NOT NULL DEFAULT true,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX geofences_account_id_active_idx ON geofences (account_id) WHERE active;
CREATE INDEX geofences_geometry_idx ON geofences USING GIST (geometry);
CREATE TRIGGER geofences_set_updated_at BEFORE UPDATE ON geofences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- TypeORM migrations tracking ----------
-- Real production has a migrations table populated by typeorm migration:run.
-- We pre-seed it with rows for every migration in src/migration/ so that any
-- future migration run against this local DB will only execute new ones.
CREATE TABLE migrations (
  id serial PRIMARY KEY,
  "timestamp" bigint NOT NULL,
  name varchar NOT NULL
);
INSERT INTO migrations ("timestamp", name) VALUES
  (1777996800000, 'RenameLegacyTables1777996800000'),
  (1777996860000, 'CreateDevicesTrucksGeofences1777996860000'),
  (1777996920000, 'CreatePositionsEvents1777996920000'),
  (1777996980000, 'CleanUsersAddCustomerFK1777996980000'),
  (1778744905014, 'TightenTelemetryCheckAddGinIndex1778744905014'),
  (1779200000000, 'AddDeviceTypeColumn1779200000000'),
  (1779400000000, 'Stage3eVehiclesAndCustomers1779400000000'),
  (1779500000000, 'MakeLegacyAccountsColumnsNullable1779500000000');

-- ---------- seed data ----------
-- One account so the FK from any future vehicle/device row resolves.
INSERT INTO accounts (email, phone, owner_name, company_name, title, pricing_tier, "statusID")
VALUES ('dev@local', '+0-000-000-0000', 'Local Dev', 'Local Dev Co', 'Local Dev Co', 'Basic', 1);

-- Default in-stock gateway for the customer-onboarding smoke flow.
INSERT INTO devices (terminal_id, auth_code, model, device_type, inventory_status)
VALUES ('000000000001', 'localdev', 'G107', 'WIRED', 'IN_STOCK');

SELECT 'Local bootstrap complete' AS status,
       (SELECT count(*) FROM accounts) AS accounts,
       (SELECT count(*) FROM vehicles) AS vehicles,
       (SELECT count(*) FROM devices) AS devices,
       (SELECT count(*) FROM drivers) AS drivers;
