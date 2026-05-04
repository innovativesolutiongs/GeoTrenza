function send8900(socket, terminalId) {

const type = Buffer.from("41", "hex"); // COM1
const data = Buffer.from("Hello World!");

const body = Buffer.concat([type, data]);

const header = Buffer.concat([
Buffer.from("8900", "hex"),
Buffer.from(body.length.toString(16).padStart(4, "0"), "hex"),
Buffer.from(terminalId, "hex"),
Buffer.from("0001", "hex")
]);

const packet = Buffer.concat([header, body]);

let checksum = 0;
for (let byte of packet) checksum ^= byte;

const finalPacket = Buffer.concat([
Buffer.from("7e", "hex"),
packet,
Buffer.from([checksum]),
Buffer.from("7e", "hex")
]);

socket.write(finalPacket);

}