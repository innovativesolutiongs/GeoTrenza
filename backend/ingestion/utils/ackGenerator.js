function generateAck(hex) {

  const terminalId = hex.substring(10, 22);     // device ID
  const serialNumber = hex.substring(22, 26);   // packet serial
  const messageId = hex.substring(2, 6);        // original message

  const serverSerial = "0001";
  const result = "00"; // success

  const body = terminalId + serverSerial + serialNumber + messageId + result;

  const bodyLength = "0005";

  const packet = "7E" + "8001" + bodyLength + body + "7E";

  return Buffer.from(packet, "hex");
}

module.exports = generateAck;