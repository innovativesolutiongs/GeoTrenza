import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 1, Migration 1 of 4 — rename the v1 telemetry / devices tables to *_legacy.
 *
 * Why: the v2 schema (docs/schema-v2.md) drops everything telemetry-side and
 * starts fresh. We rename rather than drop so the existing rows are kept for
 * 30 days as forensic backup. The Stage 2 close-out drops them; this migration
 * does NOT drop them.
 *
 * After this runs the ingestion service is still writing to the *_legacy
 * tables (the rename is transparent — TypeORM's `synchronize: true` will
 * recreate `gps_data` etc. on its next boot if it's still up). That re-creation
 * is intended: legacy ingestion keeps working until Stage 2 cutover. Migration 2
 * then creates the new `devices` table (different shape) into the freed name.
 */
export class RenameLegacyTables1777996800000 implements MigrationInterface {
  name = "RenameLegacyTables1777996800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gps_data"            RENAME TO "gps_data_legacy"`);
    await queryRunner.query(`ALTER TABLE "gps_alarms"          RENAME TO "gps_alarms_legacy"`);
    await queryRunner.query(`ALTER TABLE "gps_status"          RENAME TO "gps_status_legacy"`);
    await queryRunner.query(`ALTER TABLE "gps_extra_location"  RENAME TO "gps_extra_location_legacy"`);
    await queryRunner.query(`ALTER TABLE "gps_extra_data_msg"  RENAME TO "gps_extra_data_msg_legacy"`);
    await queryRunner.query(`ALTER TABLE "heartbeats"          RENAME TO "heartbeats_legacy"`);
    await queryRunner.query(`ALTER TABLE "devices"             RENAME TO "devices_legacy"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order so name collisions can't happen if a partial run left state mid-flight.
    await queryRunner.query(`ALTER TABLE "devices_legacy"            RENAME TO "devices"`);
    await queryRunner.query(`ALTER TABLE "heartbeats_legacy"         RENAME TO "heartbeats"`);
    await queryRunner.query(`ALTER TABLE "gps_extra_data_msg_legacy" RENAME TO "gps_extra_data_msg"`);
    await queryRunner.query(`ALTER TABLE "gps_extra_location_legacy" RENAME TO "gps_extra_location"`);
    await queryRunner.query(`ALTER TABLE "gps_status_legacy"         RENAME TO "gps_status"`);
    await queryRunner.query(`ALTER TABLE "gps_alarms_legacy"         RENAME TO "gps_alarms"`);
    await queryRunner.query(`ALTER TABLE "gps_data_legacy"           RENAME TO "gps_data"`);
  }
}
