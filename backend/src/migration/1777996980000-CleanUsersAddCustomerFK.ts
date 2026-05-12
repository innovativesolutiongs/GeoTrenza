import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 1, Migration 4 of 4 — clean dirty test rows in `users` and add the
 * users.customerID → accounts(ID) foreign key.
 *
 * Q5 audit results (2026-05-05): three rows have a customerID that does not
 * exist in accounts. All three are confirmed test data:
 *   ID = 1   EZELDAdmin   → customerID 1466
 *   ID = 4   EZ/CS/006    → customerID    6
 *   ID = 5   EZ/CS/043    → customerID   47
 *
 * NULL-check (2026-05-05): SELECT count(*) FROM users WHERE "customerID" IS NULL
 * returned 0, so SET NOT NULL is safe with no further cleanup.
 *
 * The FK is added with NOT VALID then immediately VALIDATEd in the same
 * migration — `users` is small enough that the table-scan cost is negligible.
 */
export class CleanUsersAddCustomerFK1777996980000 implements MigrationInterface {
  name = "CleanUsersAddCustomerFK1777996980000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the three dirty test rows.
    await queryRunner.query(`DELETE FROM "users" WHERE "ID" IN (1, 4, 5)`);

    // 2. Tighten customerID to NOT NULL.
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "customerID" SET NOT NULL`);

    // 3. Add the FK. NOT VALID skips the up-front table scan; VALIDATE then runs
    //    under SHARE UPDATE EXCLUSIVE (concurrent with reads/writes), which is
    //    what the schema-v2 design specifies for sub-30-second migration windows.
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "users_customerid_fkey"
          FOREIGN KEY ("customerID") REFERENCES "accounts" ("ID") NOT VALID
    `);
    await queryRunner.query(`ALTER TABLE "users" VALIDATE CONSTRAINT "users_customerid_fkey"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverses the schema changes only. The three deleted users rows
    // (ID = 1, 4, 5) CANNOT be restored by this down() — they were test data
    // and we did not save them. If a true rollback of the data is needed,
    // restore from the pre-Stage-1 pg_dump snapshot taken per the migration
    // strategy in docs/schema-v2.md.
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_customerid_fkey"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "customerID" DROP NOT NULL`);
  }
}
