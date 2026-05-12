import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 1, Migration 2 of 4 — create the new `trucks`, `devices`, `geofences`
 * tables per docs/schema-v2.md.
 *
 * Order inside up(): trucks → devices → geofences, because devices.truck_id
 * has an FK into trucks(id). Down() drops in reverse.
 *
 * PostGIS 3.4.2 is already installed in `gps_services` (see
 * docs/architecture-current.md), so this migration uses the `geometry` type
 * directly with no `CREATE EXTENSION` call.
 */
export class CreateDevicesTrucksGeofences1777996860000 implements MigrationInterface {
  name = "CreateDevicesTrucksGeofences1777996860000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Shared trigger function: bump updated_at on every UPDATE.
    // Used by trucks, devices, and geofences. positions/events don't have updated_at.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ---------------------------------------------------------------- trucks
    await queryRunner.query(`
      CREATE TABLE "trucks" (
        "id"              bigserial    PRIMARY KEY,
        "account_id"      bigint       NOT NULL,
        "registration_no" text         NOT NULL,
        "name"            text,
        "model"           text,
        "vin"             text,
        "status"          text         NOT NULL DEFAULT 'active',
        "created_at"      timestamptz  NOT NULL DEFAULT now(),
        "updated_at"      timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "trucks_account_id_fkey"
          FOREIGN KEY ("account_id") REFERENCES "accounts" ("ID") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "trucks_account_id_idx" ON "trucks" ("account_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "trucks_account_id_registration_no_uidx" ON "trucks" ("account_id", "registration_no")`);
    await queryRunner.query(`
      CREATE TRIGGER "trucks_set_updated_at"
      BEFORE UPDATE ON "trucks"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // --------------------------------------------------------------- devices
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id"               bigserial    PRIMARY KEY,
        "terminal_id"      text         NOT NULL UNIQUE,
        "imei"             text,
        "account_id"       bigint,
        "truck_id"         bigint,
        "auth_code"        text,
        "firmware_version" text,
        "model"            text         DEFAULT 'G107',
        "last_seen_at"     timestamptz,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "devices_terminal_id_format_check"
          CHECK ("terminal_id" ~ '^[0-9]{12}$'),
        CONSTRAINT "devices_account_id_fkey"
          FOREIGN KEY ("account_id") REFERENCES "accounts" ("ID") ON DELETE RESTRICT,
        CONSTRAINT "devices_truck_id_fkey"
          FOREIGN KEY ("truck_id") REFERENCES "trucks" ("id") ON DELETE SET NULL
      )
    `);
    // UNIQUE on terminal_id is created automatically by the column constraint above.
    await queryRunner.query(`CREATE INDEX "devices_account_id_idx"   ON "devices" ("account_id")`);
    await queryRunner.query(`CREATE INDEX "devices_truck_id_idx"     ON "devices" ("truck_id")`);
    await queryRunner.query(`CREATE INDEX "devices_imei_idx"         ON "devices" ("imei")`);
    await queryRunner.query(`CREATE INDEX "devices_last_seen_at_idx" ON "devices" ("last_seen_at")`);
    await queryRunner.query(`
      CREATE TRIGGER "devices_set_updated_at"
      BEFORE UPDATE ON "devices"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // ------------------------------------------------------------- geofences
    // PostGIS geometry(POLYGON, 4326). PostGIS 3.4.2 already installed.
    await queryRunner.query(`
      CREATE TABLE "geofences" (
        "id"               bigserial               PRIMARY KEY,
        "account_id"       bigint                  NOT NULL,
        "name"             text                    NOT NULL,
        "geometry"         geometry(POLYGON, 4326) NOT NULL,
        "trigger_on_enter" boolean                 NOT NULL DEFAULT true,
        "trigger_on_exit"  boolean                 NOT NULL DEFAULT true,
        "active"           boolean                 NOT NULL DEFAULT true,
        "created_at"       timestamptz             NOT NULL DEFAULT now(),
        "updated_at"       timestamptz             NOT NULL DEFAULT now(),
        CONSTRAINT "geofences_account_id_fkey"
          FOREIGN KEY ("account_id") REFERENCES "accounts" ("ID") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "geofences_account_id_active_idx" ON "geofences" ("account_id") WHERE "active"`);
    await queryRunner.query(`CREATE INDEX "geofences_geometry_idx"          ON "geofences" USING GIST ("geometry")`);
    await queryRunner.query(`
      CREATE TRIGGER "geofences_set_updated_at"
      BEFORE UPDATE ON "geofences"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse FK order: geofences (no inbound FKs) → devices (FK to trucks) → trucks.
    await queryRunner.query(`DROP TRIGGER IF EXISTS "geofences_set_updated_at" ON "geofences"`);
    await queryRunner.query(`DROP TABLE "geofences"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "devices_set_updated_at" ON "devices"`);
    await queryRunner.query(`DROP TABLE "devices"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "trucks_set_updated_at" ON "trucks"`);
    await queryRunner.query(`DROP TABLE "trucks"`);

    // set_updated_at() is only referenced by these three tables. Migration 3
    // (positions/events) does not use it, so dropping here is safe.
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at()`);
  }
}
