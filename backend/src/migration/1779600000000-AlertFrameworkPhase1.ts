import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 3d Phase 1: alert framework foundation. Four logical tables grouped
 * into one migration so a partial apply can't leave the alert subsystem
 * half-built (same rationale as Stage 3e's combined migration).
 *
 * Tables:
 *   1. alert_rules         — customer-configurable rules; jsonb config
 *   2. alerts              — fired alert lifecycle (active/ack/resolved/snoozed/muted)
 *   3. alert_subscriptions — per-user delivery preferences (channels, min severity)
 *   4. geofences (extend)  — existing geofences table gains description/color/deleted_at;
 *                            the existing `active` column doubles as the spec's `enabled`.
 */
export class AlertFrameworkPhase11779600000000 implements MigrationInterface {
  name = "AlertFrameworkPhase11779600000000";

  public async up(qr: QueryRunner): Promise<void> {
    // --- 1. alert_rules ---
    await qr.query(`
      CREATE TABLE "alert_rules" (
        "id"                  BIGSERIAL    PRIMARY KEY,
        "account_id"          BIGINT       NOT NULL,
        "name"                VARCHAR(160) NOT NULL,
        "description"         TEXT,
        "rule_type"           VARCHAR(40)  NOT NULL,
        "config"              JSONB        NOT NULL DEFAULT '{}'::jsonb,
        "severity"            VARCHAR(16)  NOT NULL DEFAULT 'MEDIUM',
        "enabled"             BOOLEAN      NOT NULL DEFAULT true,
        "scope"               VARCHAR(16)  NOT NULL DEFAULT 'FLEET',
        "target_vehicle_ids"  BIGINT[],
        "target_geofence_ids" BIGINT[],
        "deleted_at"          TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "alert_rules_severity_check"
          CHECK ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        CONSTRAINT "alert_rules_scope_check"
          CHECK ("scope" IN ('FLEET','VEHICLE','GROUP')),
        CONSTRAINT "alert_rules_rule_type_check"
          CHECK ("rule_type" IN (
            'GEOFENCE_ENTRY','GEOFENCE_EXIT','DEVICE_OFFLINE',
            'EXTENDED_IDLE','SPEED_VIOLATION','UNAUTHORIZED_MOVEMENT',
            'STUB_TEST'
          )),
        CONSTRAINT "alert_rules_account_id_fkey"
          FOREIGN KEY ("account_id") REFERENCES "accounts"("ID") ON DELETE CASCADE
      )
    `);
    await qr.query(`CREATE INDEX "alert_rules_account_id_idx" ON "alert_rules" ("account_id")`);
    await qr.query(`CREATE INDEX "alert_rules_deleted_at_idx" ON "alert_rules" ("deleted_at") WHERE "deleted_at" IS NULL`);
    await qr.query(`
      CREATE TRIGGER "alert_rules_set_updated_at"
      BEFORE UPDATE ON "alert_rules"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // --- 2. alerts ---
    await qr.query(`
      CREATE TABLE "alerts" (
        "id"                       BIGSERIAL    PRIMARY KEY,
        "account_id"               BIGINT       NOT NULL,
        "rule_id"                  BIGINT       NOT NULL,
        "vehicle_id"               BIGINT,
        "device_id"                BIGINT,
        "triggered_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "severity"                 VARCHAR(16)  NOT NULL,
        "title"                    VARCHAR(255) NOT NULL,
        "description"              TEXT,
        "payload"                  JSONB,
        "status"                   VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
        "acknowledged_at"          TIMESTAMPTZ,
        "acknowledged_by_user_id"  BIGINT,
        "resolved_at"              TIMESTAMPTZ,
        "snoozed_until"            TIMESTAMPTZ,
        "deleted_at"               TIMESTAMPTZ,
        "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "alerts_severity_check"
          CHECK ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        CONSTRAINT "alerts_status_check"
          CHECK ("status" IN ('ACTIVE','ACKNOWLEDGED','RESOLVED','SNOOZED','MUTED')),
        CONSTRAINT "alerts_account_id_fkey"
          FOREIGN KEY ("account_id") REFERENCES "accounts"("ID") ON DELETE CASCADE,
        CONSTRAINT "alerts_rule_id_fkey"
          FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE,
        CONSTRAINT "alerts_vehicle_id_fkey"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL,
        CONSTRAINT "alerts_device_id_fkey"
          FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL,
        CONSTRAINT "alerts_acknowledged_by_user_id_fkey"
          FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "users"("ID") ON DELETE SET NULL
      )
    `);
    // Dashboard "active alerts by account, newest first"
    await qr.query(`CREATE INDEX "alerts_account_status_triggered_at_idx" ON "alerts" ("account_id","status","triggered_at" DESC)`);
    // Per-vehicle alert history
    await qr.query(`CREATE INDEX "alerts_vehicle_triggered_at_idx" ON "alerts" ("vehicle_id","triggered_at" DESC) WHERE "vehicle_id" IS NOT NULL`);
    // Deduplicator lookup
    await qr.query(`CREATE INDEX "alerts_rule_triggered_at_idx" ON "alerts" ("rule_id","triggered_at" DESC)`);
    await qr.query(`CREATE INDEX "alerts_deleted_at_idx" ON "alerts" ("deleted_at") WHERE "deleted_at" IS NULL`);
    await qr.query(`
      CREATE TRIGGER "alerts_set_updated_at"
      BEFORE UPDATE ON "alerts"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // --- 3. alert_subscriptions ---
    await qr.query(`
      CREATE TABLE "alert_subscriptions" (
        "id"            BIGSERIAL    PRIMARY KEY,
        "user_id"       BIGINT       NOT NULL,
        "rule_id"       BIGINT,
        "channels"      VARCHAR(16)[] NOT NULL DEFAULT '{IN_APP}',
        "min_severity"  VARCHAR(16)  NOT NULL DEFAULT 'LOW',
        "snooze_until"  TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "alert_subscriptions_min_severity_check"
          CHECK ("min_severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        CONSTRAINT "alert_subscriptions_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users"("ID") ON DELETE CASCADE,
        CONSTRAINT "alert_subscriptions_rule_id_fkey"
          FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`CREATE INDEX "alert_subscriptions_user_idx" ON "alert_subscriptions" ("user_id")`);
    await qr.query(`CREATE INDEX "alert_subscriptions_rule_idx" ON "alert_subscriptions" ("rule_id") WHERE "rule_id" IS NOT NULL`);
    await qr.query(`
      CREATE TRIGGER "alert_subscriptions_set_updated_at"
      BEFORE UPDATE ON "alert_subscriptions"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // --- 4. geofences extension ---
    // The geofences table already exists (Stage 1 migration 1777996860000).
    // It has `active` which serves as the spec's `enabled`. We add the
    // missing surface area (description, color, deleted_at) so the Phase 4
    // builder UI has all the fields it needs.
    await qr.query(`ALTER TABLE "geofences" ADD COLUMN "description" TEXT`);
    await qr.query(`ALTER TABLE "geofences" ADD COLUMN "color" VARCHAR(16) NOT NULL DEFAULT '#3b82f6'`);
    await qr.query(`ALTER TABLE "geofences" ADD COLUMN "deleted_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX "geofences_deleted_at_idx" ON "geofences" ("deleted_at") WHERE "deleted_at" IS NULL`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "geofences_deleted_at_idx"`);
    await qr.query(`ALTER TABLE "geofences" DROP COLUMN IF EXISTS "deleted_at"`);
    await qr.query(`ALTER TABLE "geofences" DROP COLUMN IF EXISTS "color"`);
    await qr.query(`ALTER TABLE "geofences" DROP COLUMN IF EXISTS "description"`);

    await qr.query(`DROP TRIGGER IF EXISTS "alert_subscriptions_set_updated_at" ON "alert_subscriptions"`);
    await qr.query(`DROP TABLE IF EXISTS "alert_subscriptions"`);

    await qr.query(`DROP TRIGGER IF EXISTS "alerts_set_updated_at" ON "alerts"`);
    await qr.query(`DROP TABLE IF EXISTS "alerts"`);

    await qr.query(`DROP TRIGGER IF EXISTS "alert_rules_set_updated_at" ON "alert_rules"`);
    await qr.query(`DROP TABLE IF EXISTS "alert_rules"`);
  }
}
