class UnknownDeviceError extends Error {
  constructor(terminalId) {
    super(`No device registered for terminal_id ${terminalId}`);
    this.name = 'UnknownDeviceError';
    this.terminalId = terminalId;
  }
}

module.exports = UnknownDeviceError;
