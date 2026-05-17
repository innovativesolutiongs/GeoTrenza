import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 3b refinement: add `device_type` to `devices` so frontend can pick the
 * right marker semantics. WIRED devices have engine-aware statusBits and
 * should freeze on ACC-off; MAGNETIC_BATTERY / ASSET_TRACKER devices have no
 * engine signal and report `statusBits=0` as their normal stationary state.
 *
 * Default 'WIRED' so existing rows behave as before. Tighter values via CHECK
 * so a typo in production updates fails loudly. Indexed because the position
 * API joins on this column.
 */
export class AddDeviceTypeColumn1779200000000 implements MigrationInterface {
  name = "AddDeviceTypeColumn1779200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD COLUMN "device_type" VARCHAR(32) NOT NULL DEFAULT 'WIRED'
    `);
    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD CONSTRAINT "devices_device_type_check"
        CHECK ("device_type" IN ('WIRED', 'MAGNETIC_BATTERY', 'ASSET_TRACKER'))
    `);
    await queryRunner.query(
      `CREATE INDEX "devices_device_type_idx" ON "devices" ("device_type")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "devices_device_type_idx"`);
    await queryRunner.query(
      `ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_device_type_check"`
    );
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "device_type"`);
  }
}
