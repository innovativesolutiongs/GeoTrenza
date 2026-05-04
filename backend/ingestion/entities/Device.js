const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Device",
  tableName: "devices",
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
    authCode: {
      type: "varchar",
      nullable: true
    }
  }
});