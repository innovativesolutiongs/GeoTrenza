const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "GpsStatus",
  tableName: "gps_status",

  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },

    terminal_id: {
      type: "varchar",
      length: 20
    },

    status_type: {
      type: "varchar",
      length: 100
    },

    created_at: {
      type: "timestamp",
      createDate: true
    }
  }
});