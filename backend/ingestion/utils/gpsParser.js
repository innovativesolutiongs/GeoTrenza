function parseGPS(hex){

  const terminalId = hex.substring(10,22);

  const alarm = parseInt(hex.substring(26,34),16);
  const status = parseInt(hex.substring(34,42),16);

  const latHex = hex.substring(42,50);
  const lonHex = hex.substring(50,58);

  const altitudeHex = hex.substring(58,62);
  const speedHex = hex.substring(62,66);
  const directionHex = hex.substring(66,70);

  const latitude = parseInt(latHex,16)/1000000;
  const longitude = parseInt(lonHex,16)/1000000;
  const altitude = parseInt(altitudeHex,16);
  const speed = parseInt(speedHex,16);
  const direction = parseInt(directionHex,16);

  return {
    terminalId,
    alarm,
    status,
    latitude,
    longitude,
    altitude,
    speed,
    direction
  }

}

module.exports = parseGPS;