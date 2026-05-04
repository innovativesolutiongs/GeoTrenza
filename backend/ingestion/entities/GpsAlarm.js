const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "GpsAlarm",
  tableName: "gps_alarms",
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

    alarm_type: {
      type: "varchar",
      length: 50
    },

    created_at: {
      type: "timestamp",
      createDate: true
    }
  }
});