function parseLocationExtra(hex) {

  const extras = {};

  try {

    let start = 70; // after main GPS fields

    while (start < hex.length - 4) {

      const id = hex.substr(start, 2);
      const length = parseInt(hex.substr(start + 2, 2), 16);

      const valueHex = hex.substr(start + 4, length * 2);

      start += 4 + (length * 2);

      switch (id) {

        case "01":
          extras.mileage = parseInt(valueHex, 16) / 10;
          break;

        case "02":
          extras.fuel = parseInt(valueHex, 16);
          break;

        case "03":
          extras.extendedSpeed = parseInt(valueHex, 16);
          break;

        case "04":
          extras.gsmSignal = parseInt(valueHex, 16);
          break;

        case "05":
          extras.satellites = parseInt(valueHex, 16);
          break;

        case "06":
          extras.batteryVoltage = parseInt(valueHex, 16);
          break;

        default:
          extras["unknown_" + id] = valueHex;
          break;

      }

    }

  } catch (err) {

    console.log("Extra data parse error:", err.message);

  }

  return extras;

}

module.exports = parseLocationExtra;