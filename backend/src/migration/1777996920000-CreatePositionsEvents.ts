import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 1, Migration 3 of 4 — create the new `positions` and `events` tables.
 *
 * positions replaces gps_data + gps_extra_location + gps_extra_data_msg.
 * events replaces gps_alarms + gps_status (transitions only, not raw bit flips).
 *
 * Both tables FK into devices(id) (Migration 2). events also FKs into
 * positions(id) — so create positions first, drop in reverse.
 *
 * Tables start empty; ingestion is rewritten in Stage 2 to write here.
 */
export class CreatePositionsEvents1777996920000 implements MigrationInterface {
  name = "CreatePositionsEvents1777996920000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------- positions
    await queryRunner.query(`
      CREATE TABLE "positions" (
        "id"              bigserial         PRIMARY KEY,
        "device_id"       bigint            NOT NULL,
        "recorded_at"     timestamptz       NOT NULL,
        "received_at"     timestamptz       NOT NULL DEFAULT now(),
        "lat"             double precision  NOT NULL,
        "lng"             double precision  NOT NULL,
        "speed_kph"       real,
        "heading_deg"     smallint,
        "altitude_m"      integer,
        "satellites"      smallint,
        "signal_strength" smallint,
        "battery_voltage" real,
        "mileage_m"       integer,
        "telemetry"       jsonb             NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "positions_telemetry_size_check"
          CHECK (octet_length("telemetry"::text) < 8192),
        CONSTRAINT "positions_device_id_fkey"
          FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT
      )
    `);
    // Hot index: live-map "latest position per device" + route-playback "device X between A and B".
    await queryRunner.query(`CREATE INDEX "positions_device_id_recorded_at_idx" ON "positions" ("device_id", "recorded_at" DESC)`);
    // Cross-fleet "what happened in the last N minutes" admin queries.
    await queryRunner.query(`CREATE INDEX "positions_recorded_at_idx" ON "positions" ("recorded_at" DESC)`);

    // ----------------------------------------------------------------- events
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id"          bigserial    PRIMARY KEY,
        "device_id"   bigint       NOT NULL,
        "position_id" bigint,
        "kind"        text         NOT NULL,
        "payload"     jsonb        NOT NULL DEFAULT '{}'::jsonb,
        "started_at"  timestamptz  NOT NULL,
        "ended_at"    timestamptz,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "events_payload_size_check"
          CHECK (octet_length("payload"::text) < 8192),
        CONSTRAINT "events_device_id_fkey"
          FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT,
        CONSTRAINT "events_position_id_fkey"
          FOREIGN KEY ("position_id") REFERENCES "positions" ("id") ON DELETE SET NULL
      )
    `);
    // Device-detail page events feed.
    await queryRunner.query(`CREATE INDEX "events_device_id_started_at_idx" ON "events" ("device_id", "started_at" DESC)`);
    // Cross-fleet "all recent events" admin/alert feeds.
    await queryRunner.query(`CREATE INDEX "events_started_at_idx" ON "events" ("started_at" DESC)`);
    // Partial index for "currently alarming on this device" — most events are closed.
    await queryRunner.query(`CREATE INDEX "events_active_alarms_idx" ON "events" ("device_id") WHERE "ended_at" IS NULL`);
    // "Show me all SOS events this month" / kind-filtered feeds.
    await queryRunner.query(`CREATE INDEX "events_kind_started_at_idx" ON "events" ("kind", "started_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // events first (it FKs into positions).
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "positions"`);
  }
}
