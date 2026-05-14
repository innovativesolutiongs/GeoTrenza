const UnknownDeviceError = require('../errors/UnknownDeviceError');

async function resolveDeviceId(terminalId, deviceRepo) {
  const device = await deviceRepo.findOne({ where: { terminal_id: terminalId } });
  if (!device) {
    throw new UnknownDeviceError(terminalId);
  }
  return device.id;
}

module.exports = resolveDeviceId;
