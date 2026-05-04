function parse0900(hex) {

  try {

    const buffer = Buffer.from(hex, "hex");

    const messageId = buffer.slice(1, 3).toString("hex").toUpperCase();

    if (messageId !== "0900") return null;

    // Terminal ID
    const terminalId = buffer.slice(5, 11).toString("hex").toUpperCase();

    // Transmission Type (Table 5-15)
    const type = buffer.slice(13, 14).toString("hex").toUpperCase();

    // Command Body
    const body = buffer.slice(14, buffer.length - 2);

    let typeName = "UNKNOWN";

    switch (type) {
      case "00":
        typeName = "GNSS DATA";
        break;

      case "0B":
        typeName = "IC CARD INFORMATION";
        break;

      case "41":
        typeName = "COM1 SERIAL DATA";
        break;

      case "42":
        typeName = "COM2 SERIAL DATA";
        break;

      case "B2":
        typeName = "BMS1 BATTERY DATA";
        break;

      case "F8":
        typeName = "DRIVING REPORT DATA";
        break;

      case "F9":
        typeName = "BMS2 BATTERY DATA";
        break;

      default:
        if (parseInt(type, 16) >= 0xFA) {
          typeName = "USER DEFINED DATA";
        }
    }

    console.log("📡 0900 Transmission Packet");
    console.log("📟 Terminal ID:", terminalId);
    console.log("📦 Type:", type, "-", typeName);
    console.log("📨 Data:", body.toString());

    return {
      terminalId,
      type,
      typeName,
      data: body.toString()
    };

  } catch (err) {
    console.log("⚠️ 0900 Parse Error:", err.message);
    return null;
  }
}

module.exports = parse0900;