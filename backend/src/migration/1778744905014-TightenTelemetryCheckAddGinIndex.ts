import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 2 Phase B, Step 3 of 7 — prepare `positions.telemetry` for production
 * scale per phase-b-handler-rewrite.md Decision 3.
 *
 * Two changes, both on `positions.telemetry`:
 *
 *   1. Tighten the size CHECK from 8 KB → 2 KB. At 100M rows scale, 8 KB
 *      average = 800 GB of telemetry storage; realistic Mobicom TLV
 *      emissions fit comfortably under 2 KB. Caught at write time, not at
 *      read time, so the tighter cap is enforced before bad data lands.
 *
 *   2. Add a single-column GIN index on `telemetry` using `jsonb_path_ops`.
 *      Required from day 1, not deferred — cost to build on an empty table
 *      is zero; cost to build later on 10M+ rows is hours of downtime under
 *      lock. `jsonb_path_ops` is ~⅓ the size of the default `jsonb_ops` and
 *      faster for `@>` containment, which is the query pattern Phase B
 *      handlers will produce (e.g. "rows where telemetry @> '{kind: ...}'").
 *
 * Safe on existing data: `positions` is currently empty in production
 * (Stage 1 created the table; ingestion is rewritten to start writing in
 * Stage 2 Phase B Step 4). The tighter CHECK therefore has no rows to fail.
 *
 * Postgres has no `ALTER CONSTRAINT` for CHECKs, so step 1 is DROP +
 * re-ADD under the same constraint name.
 */
export class TightenTelemetryCheckAddGinIndex1778744905014 implements MigrationInterface {
  name = "TightenTelemetryCheckAddGinIndex1778744905014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the existing 8 KB CHECK (from CreatePositionsEvents migration).
    await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "positions_telemetry_size_check"`);

    // 2. Re-add the same-named CHECK with the tighter 2 KB cap.
    await queryRunner.query(`
      ALTER TABLE "positions"
        ADD CONSTRAINT "positions_telemetry_size_check"
          CHECK (octet_length("telemetry"::text) < 2048)
    `);

    // 3. GIN index for containment queries on telemetry. jsonb_path_ops
    //    supports `@>` only — that's all the Phase B query patterns need.
    await queryRunner.query(`
      CREATE INDEX "positions_telemetry_gin_idx"
        ON "positions"
        USING gin ("telemetry" jsonb_path_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: index first, then the constraint swap.
    // 1. Drop the GIN index.
    await queryRunner.query(`DROP INDEX "positions_telemetry_gin_idx"`);

    // 2. Drop the tightened 2 KB CHECK.
    await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "positions_telemetry_size_check"`);

    // 3. Re-add the original 8 KB CHECK so the schema matches the
    //    post-CreatePositionsEvents state exactly.
    await queryRunner.query(`
      ALTER TABLE "positions"
        ADD CONSTRAINT "positions_telemetry_size_check"
          CHECK (octet_length("telemetry"::text) < 8192)
    `);
  }
}
