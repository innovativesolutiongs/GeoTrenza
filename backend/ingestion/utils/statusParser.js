function parseStatus(statusValue) {

  const status = [];

  if (statusValue & (1 << 0)) status.push("ACC ON");
  else status.push("ACC OFF");

  if (statusValue & (1 << 1)) status.push("GPS Fixed");
  else status.push("GPS Not Fixed");

  if (statusValue & (1 << 2)) status.push("Latitude South");
  else status.push("Latitude North");

  if (statusValue & (1 << 3)) status.push("Longitude West");
  else status.push("Longitude East");

  if (statusValue & (1 << 4)) status.push("Vehicle Running");
  else status.push("Vehicle Stopped");

  if (statusValue & (1 << 5)) status.push("Oil Cut / Immobilizer Active");

  if (statusValue & (1 << 6)) status.push("Door Open");
  else status.push("Door Closed");

  if (statusValue & (1 << 7)) status.push("Trunk Open");

  if (statusValue & (1 << 8)) status.push("Fuel Circuit Cut");

  if (statusValue & (1 << 9)) status.push("Power Cut");

  if (statusValue & (1 << 10)) status.push("Normal / Immobilizer Recover");

  if (statusValue & (1 << 13)) status.push("Door 1 Open (Front Door)");

  return status;

}

module.exports = parseStatus;