import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 3e: rename trucks → vehicles, extend customer (accounts) + users
 * tables with admin-CRUD fields, add inventory_status + soft-delete to
 * devices, create drivers table. One migration so a partial run can't leave
 * production half-converted.
 */
export class Stage3eVehiclesAndCustomers1779400000000 implements MigrationInterface {
  name = "Stage3eVehiclesAndCustomers1779400000000";

  public async up(qr: QueryRunner): Promise<void> {
    // --- 1. Rename trucks → vehicles + devices.truck_id → devices.vehicle_id
    await qr.query(`ALTER TABLE "trucks" RENAME TO "vehicles"`);
    await qr.query(`ALTER INDEX "trucks_pkey" RENAME TO "vehicles_pkey"`);
    await qr.query(`ALTER INDEX "trucks_account_id_idx" RENAME TO "vehicles_account_id_idx"`);
    await qr.query(`ALTER INDEX "trucks_account_id_registration_no_uidx" RENAME TO "vehicles_account_id_registration_no_uidx"`);
    await qr.query(`ALTER SEQUENCE "trucks_id_seq" RENAME TO "vehicles_id_seq"`);
    await qr.query(`ALTER TABLE "vehicles" RENAME CONSTRAINT "trucks_account_id_fkey" TO "vehicles_account_id_fkey"`);
    await qr.query(`ALTER TRIGGER "trucks_set_updated_at" ON "vehicles" RENAME TO "vehicles_set_updated_at"`);

    await qr.query(`ALTER TABLE "devices" RENAME COLUMN "truck_id" TO "vehicle_id"`);
    await qr.query(`ALTER INDEX "devices_truck_id_idx" RENAME TO "devices_vehicle_id_idx"`);
    await qr.query(`ALTER TABLE "devices" RENAME CONSTRAINT "devices_truck_id_fkey" TO "devices_vehicle_id_fkey"`);

    // --- 2. Extend vehicles with descriptive + metadata + soft delete
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "year" INTEGER`);
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "make" VARCHAR(64)`);
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "manufacturer" VARCHAR(64)`);
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "vehicle_type" VARCHAR(32) NOT NULL DEFAULT 'Truck'`);
    await qr.query(`
      ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_check"
        CHECK ("vehicle_type" IN ('Truck','Trailer','Car','Van','Bus','Generator','Container','Heavy Equipment','Other'))
    `);
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "metadata" JSONB`);
    await qr.query(`ALTER TABLE "vehicles" ADD COLUMN "deleted_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX "vehicles_deleted_at_idx" ON "vehicles" ("deleted_at") WHERE "deleted_at" IS NULL`);

    // --- 3. Extend accounts with customer/admin fields + pricing + soft delete
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "email" VARCHAR(255)`);
    await qr.query(`CREATE UNIQUE INDEX "accounts_email_uidx" ON "accounts" (LOWER("email")) WHERE "email" IS NOT NULL`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "phone" VARCHAR(50)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "owner_name" VARCHAR(120)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "company_name" VARCHAR(255)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "pricing_tier" VARCHAR(32) NOT NULL DEFAULT 'Basic'`);
    await qr.query(`
      ALTER TABLE "accounts" ADD CONSTRAINT "accounts_pricing_tier_check"
        CHECK ("pricing_tier" IN ('Basic','Pro','Enterprise'))
    `);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "billing_email" VARCHAR(255)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "billing_contact_name" VARCHAR(120)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "address_line1" VARCHAR(255)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "address_line2" VARCHAR(255)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "city" VARCHAR(120)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "state" VARCHAR(120)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "postal_code" VARCHAR(20)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "country" VARCHAR(120)`);
    await qr.query(`ALTER TABLE "accounts" ADD COLUMN "deleted_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX "accounts_deleted_at_idx" ON "accounts" ("deleted_at") WHERE "deleted_at" IS NULL`);

    // --- 4. Devices: inventory_status + soft delete
    await qr.query(`ALTER TABLE "devices" ADD COLUMN "inventory_status" VARCHAR(32) NOT NULL DEFAULT 'IN_STOCK'`);
    await qr.query(`
      ALTER TABLE "devices" ADD CONSTRAINT "devices_inventory_status_check"
        CHECK ("inventory_status" IN ('IN_STOCK','ASSIGNED','ACTIVE','INACTIVE','RETURNED','DECOMMISSIONED'))
    `);
    await qr.query(`CREATE INDEX "devices_inventory_status_idx" ON "devices" ("inventory_status")`);
    await qr.query(`ALTER TABLE "devices" ADD COLUMN "deleted_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX "devices_deleted_at_idx" ON "devices" ("deleted_at") WHERE "deleted_at" IS NULL`);
    // Existing rows: if a device has an account_id, mark it ASSIGNED;
    // if it has a vehicle_id, mark it ACTIVE.
    await qr.query(`UPDATE "devices" SET "inventory_status" = 'ASSIGNED' WHERE "account_id" IS NOT NULL AND "vehicle_id" IS NULL`);
    await qr.query(`UPDATE "devices" SET "inventory_status" = 'ACTIVE' WHERE "vehicle_id" IS NOT NULL`);

    // --- 5. Drivers table (new)
    await qr.query(`
      CREATE TABLE "drivers" (
        "id"             BIGSERIAL    PRIMARY KEY,
        "account_id"     BIGINT       NOT NULL,
        "name"           VARCHAR(120) NOT NULL,
        "phone"          VARCHAR(50),
        "email"          VARCHAR(255),
        "license_number" VARCHAR(64),
        "license_expiry" DATE,
        "hire_date"      DATE,
        "vehicle_id"     BIGINT,
        "status"         VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
        "deleted_at"     TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "drivers_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE')),
        CONSTRAINT "drivers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("ID") ON DELETE RESTRICT,
        CONSTRAINT "drivers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL
      )
    `);
    await qr.query(`CREATE INDEX "drivers_account_id_idx" ON "drivers" ("account_id")`);
    await qr.query(`CREATE INDEX "drivers_vehicle_id_idx" ON "drivers" ("vehicle_id")`);
    await qr.query(`CREATE INDEX "drivers_deleted_at_idx" ON "drivers" ("deleted_at") WHERE "deleted_at" IS NULL`);
    await qr.query(`
      CREATE TRIGGER "drivers_set_updated_at"
      BEFORE UPDATE ON "drivers"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // --- 6. Users table additions (preserve all v1 columns)
    // password_hash holds bcrypt for users created via the new admin flow;
    // legacy `password` column (md5) untouched so the existing login path keeps
    // working for v1 rows. last_login_at and deleted_at are new; `role`
    // distinguishes GEOTRENZA_ADMIN vs CUSTOMER_ADMIN.
    await qr.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255)`);
    await qr.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" VARCHAR(32)`);
    await qr.query(`
      ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
        CHECK ("role" IS NULL OR "role" IN ('GEOTRENZA_ADMIN','CUSTOMER_ADMIN'))
    `);
    await qr.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ`);
    await qr.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at") WHERE "deleted_at" IS NULL`);
    await qr.query(`CREATE UNIQUE INDEX "users_email_uidx" ON "users" (LOWER("email")) WHERE "email" IS NOT NULL AND "deleted_at" IS NULL`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Reverse in the opposite order. Best-effort — production rollback path
    // not exercised; if you need this, write a follow-up migration.
    await qr.query(`DROP INDEX IF EXISTS "users_email_uidx"`);
    await qr.query(`DROP INDEX IF EXISTS "users_deleted_at_idx"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`);
    await qr.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"`);

    await qr.query(`DROP TABLE IF EXISTS "drivers"`);

    await qr.query(`DROP INDEX IF EXISTS "devices_deleted_at_idx"`);
    await qr.query(`ALTER TABLE "devices" DROP COLUMN IF EXISTS "deleted_at"`);
    await qr.query(`DROP INDEX IF EXISTS "devices_inventory_status_idx"`);
    await qr.query(`ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_inventory_status_check"`);
    await qr.query(`ALTER TABLE "devices" DROP COLUMN IF EXISTS "inventory_status"`);

    for (const col of [
      "deleted_at","country","postal_code","state","city","address_line2","address_line1",
      "billing_contact_name","billing_email","pricing_tier","company_name","owner_name","phone","email",
    ]) {
      await qr.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "${col}"`);
    }
    await qr.query(`DROP INDEX IF EXISTS "accounts_deleted_at_idx"`);
    await qr.query(`DROP INDEX IF EXISTS "accounts_email_uidx"`);
    await qr.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_pricing_tier_check"`);

    await qr.query(`DROP INDEX IF EXISTS "vehicles_deleted_at_idx"`);
    for (const col of ["deleted_at","metadata","vehicle_type","manufacturer","make","year"]) {
      await qr.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "${col}"`);
    }
    await qr.query(`ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_vehicle_type_check"`);

    await qr.query(`ALTER TABLE "devices" RENAME CONSTRAINT "devices_vehicle_id_fkey" TO "devices_truck_id_fkey"`);
    await qr.query(`ALTER INDEX "devices_vehicle_id_idx" RENAME TO "devices_truck_id_idx"`);
    await qr.query(`ALTER TABLE "devices" RENAME COLUMN "vehicle_id" TO "truck_id"`);

    await qr.query(`ALTER TRIGGER "vehicles_set_updated_at" ON "vehicles" RENAME TO "trucks_set_updated_at"`);
    await qr.query(`ALTER TABLE "vehicles" RENAME CONSTRAINT "vehicles_account_id_fkey" TO "trucks_account_id_fkey"`);
    await qr.query(`ALTER SEQUENCE "vehicles_id_seq" RENAME TO "trucks_id_seq"`);
    await qr.query(`ALTER INDEX "vehicles_account_id_registration_no_uidx" RENAME TO "trucks_account_id_registration_no_uidx"`);
    await qr.query(`ALTER INDEX "vehicles_account_id_idx" RENAME TO "trucks_account_id_idx"`);
    await qr.query(`ALTER INDEX "vehicles_pkey" RENAME TO "trucks_pkey"`);
    await qr.query(`ALTER TABLE "vehicles" RENAME TO "trucks"`);
  }
}
