const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Position",
  tableName: "positions",
  columns: {
    id: { primary: true, type: "bigint", generated: "increment" },
    device_id: { type: "bigint" },
    recorded_at: { type: "timestamp with time zone" },
    received_at: { type: "timestamp with time zone" },
    lat: { type: "double precision" },
    lng: { type: "double precision" },
    speed_kph: { type: "real", nullable: true },
    heading_deg: { type: "smallint", nullable: true },
    altitude_m: { type: "integer", nullable: true },
    satellites: { type: "smallint", nullable: true },
    signal_strength: { type: "smallint", nullable: true },
    battery_voltage: { type: "real", nullable: true },
    mileage_m: { type: "integer", nullable: true },
    telemetry: { type: "jsonb", nullable: true }
  }
});
