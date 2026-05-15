const { categorizeError } = require('../../ingestion/errors/errorCategories');
const ParseError = require('../../ingestion/errors/ParseError');
const UnknownDeviceError = require('../../ingestion/errors/UnknownDeviceError');
const { QueryFailedError } = require('typeorm');

function makeQueryFailedError(code) {
  // QueryFailedError(query, parameters, driverError) — driverError needs toString();
  // a plain object inherits Object.prototype.toString, which is enough.
  const driverError = code == null
    ? { message: 'driver error without code' }
    : { code, message: `pg error ${code}` };
  return new QueryFailedError('SELECT 1', [], driverError);
}

describe('categorizeError', () => {
  test('ParseError → PARSE_ERROR / warn / ack 2 / reject', () => {
    const result = categorizeError(new ParseError('bad packet', 'deadbeef'));

    expect(result).toEqual({
      category: 'PARSE_ERROR',
      logLevel: 'warn',
      ackResult: 2,
      action: 'reject',
    });
  });

  test('UnknownDeviceError → UNKNOWN_DEVICE / info / ack 1 / reject', () => {
    const result = categorizeError(new UnknownDeviceError('690106149138'));

    expect(result).toEqual({
      category: 'UNKNOWN_DEVICE',
      logLevel: 'info',
      ackResult: 1,
      action: 'reject',
    });
  });

  test('QueryFailedError with pg code 23505 (unique_violation) → DB_CONSTRAINT_VIOLATION', () => {
    const result = categorizeError(makeQueryFailedError('23505'));

    expect(result).toEqual({
      category: 'DB_CONSTRAINT_VIOLATION',
      logLevel: 'error',
      ackResult: 1,
      action: 'reject',
    });
  });

  test('QueryFailedError with pg code 23514 (check_violation) → DB_CONSTRAINT_VIOLATION (covers class 23)', () => {
    const result = categorizeError(makeQueryFailedError('23514'));

    expect(result.category).toBe('DB_CONSTRAINT_VIOLATION');
    expect(result.logLevel).toBe('error');
    expect(result.ackResult).toBe(1);
  });

  test('QueryFailedError with pg code 08006 (connection_failure) → DB_CONNECTION_ERROR', () => {
    const result = categorizeError(makeQueryFailedError('08006'));

    expect(result).toEqual({
      category: 'DB_CONNECTION_ERROR',
      logLevel: 'error',
      ackResult: 1,
      action: 'reject',
    });
  });

  test('QueryFailedError with no code or unrecognized code → DB_OTHER_ERROR', () => {
    expect(categorizeError(makeQueryFailedError(null)).category).toBe('DB_OTHER_ERROR');
    expect(categorizeError(makeQueryFailedError('42P01')).category).toBe('DB_OTHER_ERROR');

    // verify full shape on one of them
    expect(categorizeError(makeQueryFailedError(null))).toEqual({
      category: 'DB_OTHER_ERROR',
      logLevel: 'error',
      ackResult: 1,
      action: 'reject',
    });
  });

  test('plain Error or TypeError → UNEXPECTED_ERROR', () => {
    expect(categorizeError(new Error('something broke'))).toEqual({
      category: 'UNEXPECTED_ERROR',
      logLevel: 'error',
      ackResult: 1,
      action: 'reject',
    });
    expect(categorizeError(new TypeError('not a function')).category).toBe('UNEXPECTED_ERROR');
  });

  test('null or undefined → UNEXPECTED_ERROR (defensive)', () => {
    expect(categorizeError(null).category).toBe('UNEXPECTED_ERROR');
    expect(categorizeError(undefined).category).toBe('UNEXPECTED_ERROR');
  });
});
