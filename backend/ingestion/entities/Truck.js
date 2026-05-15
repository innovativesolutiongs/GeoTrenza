const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Truck",
  tableName: "trucks",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    account_id: { type: "bigint" },
    registration_no: { type: "text" },
    name: { type: "text", nullable: true },
    model: { type: "text", nullable: true },
    vin: { type: "text", nullable: true },
    status: { type: "text" },
    created_at: { type: "timestamp with time zone" },
    updated_at: { type: "timestamp with time zone" }
  }
});
