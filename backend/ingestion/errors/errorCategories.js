const UnknownDeviceError = require('./UnknownDeviceError');
const ParseError = require('./ParseError');
const { QueryFailedError } = require('typeorm');

// Maps an error instance to a structured response category.
// Returns { category, logLevel, ackResult, action } per Phase B design doc Decision E.
//
// ACK result codes per Mobicom JT808 V2.2 spec Table 5-1:
//   0 = success/confirm, 1 = failed, 2 = message error, 3 = not support
function categorizeError(err) {
  if (err instanceof ParseError) {
    return { category: 'PARSE_ERROR', logLevel: 'warn', ackResult: 2, action: 'reject' };
  }
  if (err instanceof UnknownDeviceError) {
    return { category: 'UNKNOWN_DEVICE', logLevel: 'info', ackResult: 1, action: 'reject' };
  }
  if (err instanceof QueryFailedError) {
    // Postgres error classes: '23' = integrity_constraint_violation, '08' = connection_exception
    const pgCode = (err.driverError && err.driverError.code) || '';
    if (pgCode.startsWith('23')) {
      return { category: 'DB_CONSTRAINT_VIOLATION', logLevel: 'error', ackResult: 1, action: 'reject' };
    }
    if (pgCode.startsWith('08')) {
      return { category: 'DB_CONNECTION_ERROR', logLevel: 'error', ackResult: 1, action: 'reject' };
    }
    return { category: 'DB_OTHER_ERROR', logLevel: 'error', ackResult: 1, action: 'reject' };
  }
  return { category: 'UNEXPECTED_ERROR', logLevel: 'error', ackResult: 1, action: 'reject' };
}

module.exports = { categorizeError };
