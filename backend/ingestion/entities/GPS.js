const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "GpsData",
  tableName: "gps_data",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },
    terminalId: {
      type: "varchar",
      nullable: true
    },
    latitude: {
      type: "float",
      nullable: true
    },
    longitude: {
      type: "float",
      nullable: true
    },
    speed: {
      type: "float",
      nullable: true
    },
    createdAt: {
      type: "timestamp",
      createDate: true
    }
  }
});