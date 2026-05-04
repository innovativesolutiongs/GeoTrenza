const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Heartbeat",
  tableName: "heartbeats",
  columns: {
    id: { primary: true, type: "int", generated: true },
    terminalId: { type: "varchar" },
    createdAt: { type: "timestamp", createDate: true }
  }
});