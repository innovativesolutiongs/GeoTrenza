const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({

  name: "GpsExtraLocation",

  tableName: "gps_extra_location",

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

    mileage: {
      type: "float",
      nullable: true
    },

    fuel: {
      type: "int",
      nullable: true
    },

    speed_ext: {
      type: "float",
      nullable: true
    },

    alarm_event: {
      type: "int",
      nullable: true
    },

    signal_strength: {
      type: "int",
      nullable: true
    },

    satellites: {
      type: "int",
      nullable: true
    },

    battery_voltage: {
      type: "float",
      nullable: true
    },

    temperature: {
      type: "float",
      nullable: true
    },

    fuel_sensor: {
      type: "int",
      nullable: true
    },

    external_voltage: {
      type: "float",
      nullable: true
    },

    created_at: {
      type: "timestamp",
      createDate: true
    }

  }

});