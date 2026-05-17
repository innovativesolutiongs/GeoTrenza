const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Vehicle",
  tableName: "vehicles",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    account_id: { type: "bigint" },
    registration_no: { type: "text" },
    name: { type: "text", nullable: true },
    model: { type: "text", nullable: true },
    vin: { type: "text", nullable: true },
    year: { type: "int", nullable: true },
    make: { type: "varchar", length: 64, nullable: true },
    manufacturer: { type: "varchar", length: 64, nullable: true },
    vehicle_type: { type: "varchar", length: 32 },
    metadata: { type: "jsonb", nullable: true },
    status: { type: "text" },
    deleted_at: { type: "timestamp with time zone", nullable: true },
    created_at: { type: "timestamp with time zone" },
    updated_at: { type: "timestamp with time zone" }
  }
});
