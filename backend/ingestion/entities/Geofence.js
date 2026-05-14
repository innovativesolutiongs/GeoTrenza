const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Geofence",
  tableName: "geofences",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    account_id: { type: "bigint" },
    name: { type: "text" },
    geometry: { type: "geometry" },
    trigger_on_enter: { type: "boolean" },
    trigger_on_exit: { type: "boolean" },
    active: { type: "boolean" },
    created_at: { type: "timestamp with time zone" },
    updated_at: { type: "timestamp with time zone" }
  }
});
