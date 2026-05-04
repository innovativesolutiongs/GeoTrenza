const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({

  name: "GpsExtraDatamsg",
  tableName: "gps_extra_data_msg",

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

    message_id: {
      type: "varchar",
      length: 10,
      nullable: true
    },

    mileage: {
      type: "numeric",
      nullable: true
    },

    fuel: {
      type: "numeric",
      nullable: true
    },

    gsm_signal: {
      type: "int",
      nullable: true
    },

    gnss_signal: {
      type: "int",
      nullable: true
    },

    battery_voltage: {
      type: "numeric",
      nullable: true
    },

    battery_percent: {
      type: "int",
      nullable: true
    },

    temperature: {
      type: "numeric",
      nullable: true
    },

    humidity: {
      type: "numeric",
      nullable: true
    },

    raw_extra: {
      type: "jsonb",
      nullable: true
    },

    created_at: {
      type: "timestamp",
      createDate: true
    }

  }

});