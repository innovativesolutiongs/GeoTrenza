import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Stage 3e cleanup: drop NOT NULL from the legacy v1 `accounts` columns
 * so the new customer-creation flow doesn't have to stuff placeholder
 * values (`code: ""`, `dotNo: ""`, `statusID: 1`, …) into 30+ fields.
 *
 * We do NOT drop the columns yet — Stage 4 will, once we verify nothing
 * in the legacy login / employee / allocation paths still reads them.
 */
export class MakeLegacyAccountsColumnsNullable1779500000000 implements MigrationInterface {
  name = "MakeLegacyAccountsColumnsNullable1779500000000";

  // Columns the v1 schema declared NOT NULL but we no longer require.
  private readonly cols = [
    "refID","code","dotNo","mcNo","address",
    "stateName","cityName","zipCode",
    "shpAddress","shpStateName","shpCityName","shpZipCode",
    "phoneNo","emailID","nemailID","firstName","lastName","dlNo",
    "totT","totD","totS","batchID",
    "teamID","assignTo",
    "planID","elogID","elogKey","chkConfim",
    "appActiveID","wapActiveID","mayaPlanID","planTypeID","rowID",
    "imageFile","userID","companyID","logID",
  ];

  public async up(qr: QueryRunner): Promise<void> {
    for (const c of this.cols) {
      await qr.query(`ALTER TABLE "accounts" ALTER COLUMN "${c}" DROP NOT NULL`);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Re-asserting NOT NULL only works if no NULL rows exist. Best-effort:
    // every column gets back to NOT NULL only if data is clean.
    for (const c of this.cols) {
      await qr.query(`ALTER TABLE "accounts" ALTER COLUMN "${c}" SET NOT NULL`);
    }
  }
}
