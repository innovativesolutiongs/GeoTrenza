const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Event",
  tableName: "events",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    device_id: { type: "bigint" },
    position_id: { type: "bigint", nullable: true },
    kind: { type: "text" },
    payload: { type: "jsonb" },
    started_at: { type: "timestamp with time zone" },
    ended_at: { type: "timestamp with time zone", nullable: true },
    created_at: { type: "timestamp with time zone" }
  }
});
