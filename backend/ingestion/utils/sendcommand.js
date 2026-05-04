function sendCommand(socket, terminalId) {

const command = "(cut,1,1)";
const commandHex = Buffer.from(command).toString("hex");

const body = Buffer.concat([
Buffer.from("01", "hex"),
Buffer.from(commandHex, "hex")
]);

const header = Buffer.concat([
Buffer.from("8300", "hex"),
Buffer.from(body.length.toString(16).padStart(4,"0"), "hex"),
Buffer.from(terminalId, "hex"),
Buffer.from("0000", "hex")
]);

const packet = Buffer.concat([header, body]);

let checksum = 0;
for (let byte of packet) checksum ^= byte;

const finalPacket = Buffer.concat([
Buffer.from("7e","hex"),
packet,
Buffer.from([checksum]),
Buffer.from("7e","hex")
]);

socket.write(finalPacket);
}