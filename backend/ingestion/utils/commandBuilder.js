function buildCommand(terminalId, command) {

    const messageId = "8300";

    const commandHex = Buffer.from(command).toString("hex");

    const serial = "0001";

    const bodyLength = (commandHex.length / 2 + 5)
        .toString(16)
        .padStart(4, "0");

    const packet =
        messageId +
        bodyLength +
        terminalId +
        serial +
        "01" +
        commandHex;

    let checksum = 0;

    for (let i = 0; i < packet.length; i += 2) {
        checksum ^= parseInt(packet.substr(i, 2), 16);
    }

    const checksumHex = checksum.toString(16).padStart(2, "0");

    const finalPacket = "7E" + packet + checksumHex + "7E";

    return Buffer.from(finalPacket, "hex");
}

module.exports = buildCommand;