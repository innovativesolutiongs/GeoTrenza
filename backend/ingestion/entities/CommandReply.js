const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "CommandReply",
  tableName: "command_reply",
  columns: {
    id: { primary: true, type: "int", generated: true },
    terminalId: { type: "varchar" },
    command: { type: "text" }
  }
});