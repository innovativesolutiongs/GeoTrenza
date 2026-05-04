function parseExtraMessages(hex) {

  const extras = {};
  let index = 70; // start after main GPS fields

  try {

    while (index < hex.length - 4) {

      const id = hex.substr(index, 2);
      const length = parseInt(hex.substr(index + 2, 2), 16);
      const valueHex = hex.substr(index + 4, length * 2);

      index += 4 + (length * 2);

      switch (id) {

        case "01":
          extras.mileage = parseInt(valueHex, 16) / 10;
          break;

        case "02":
          extras.fuel = parseInt(valueHex, 16);
          break;

        case "04":
          extras.batteryStatus = valueHex;
          break;

        case "2B":
          extras.fuelAnalog = parseInt(valueHex, 16);
          break;

        case "30":
          extras.gsmSignal = parseInt(valueHex, 16);
          break;

        case "31":
          extras.satellites = parseInt(valueHex, 16);
          break;

        case "50":
          extras.fuelSensor = parseInt(valueHex, 16);
          break;

        case "51":
          extras.temperature = parseInt(valueHex, 16) / 10;
          break;

        case "52":
          extras.rotation = parseInt(valueHex, 16);
          break;

        case "55":
          extras.loadWeight = parseInt(valueHex, 16) / 10;
          break;

        case "56":
          extras.batteryPercent = parseInt(valueHex, 16);
          break;

        case "61":
          extras.externalVoltage = parseInt(valueHex, 16) / 100;
          break;

        case "88":
          extras.workHours = parseInt(valueHex, 16);
          break;

        case "E1":
          extras.batteryVoltage = parseInt(valueHex, 16) / 10;
          break;

        case "E2":
          extras.iccid = valueHex;
          break;

        case "E3":
          extras.accelerometer = valueHex;
          break;

        case "E4":
          extras.lightSensor = parseInt(valueHex, 16) / 100;
          break;

        case "E5":
          extras.pressure = parseInt(valueHex, 16);
          break;

        case "F9":
          extras.batteryPercent = parseInt(valueHex, 16);
          break;

        default:
          extras["unknown_" + id] = valueHex;

      }

    }

  } catch (err) {

    console.log("Extra message parse error:", err.message);

  }

  return extras;

}

module.exports = parseExtraMessages;