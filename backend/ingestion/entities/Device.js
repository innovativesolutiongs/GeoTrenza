const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Device",
  tableName: "devices",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    terminal_id: { type: "text" },
    imei: { type: "text", nullable: true },
    account_id: { type: "bigint", nullable: true },
    truck_id: { type: "bigint", nullable: true },
    auth_code: { type: "text", nullable: true },
    firmware_version: { type: "text", nullable: true },
    model: { type: "text", nullable: true },
    last_seen_at: { type: "timestamp with time zone", nullable: true },
    created_at: { type: "timestamp with time zone" },
    updated_at: { type: "timestamp with time zone" }
  }
});
