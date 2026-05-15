const resolveDeviceId = require('../../ingestion/utils/resolveDeviceId');
const UnknownDeviceError = require('../../ingestion/errors/UnknownDeviceError');

function makeDeviceRepo(findOneImpl) {
  return {
    findOne: jest.fn(findOneImpl),
  };
}

describe('resolveDeviceId', () => {
  test('happy path: returns device.id when terminal_id matches', async () => {
    const repo = makeDeviceRepo(async () => ({ id: '42', terminal_id: '690106149138' }));

    const id = await resolveDeviceId('690106149138', repo);

    expect(id).toBe('42');
  });

  test('bigint-string preservation: id beyond Number.MAX_SAFE_INTEGER passes through unchanged', async () => {
    const bigId = '9007199254740993';
    const repo = makeDeviceRepo(async () => ({ id: bigId, terminal_id: '690106149138' }));

    const id = await resolveDeviceId('690106149138', repo);

    expect(id).toBe(bigId);
    expect(typeof id).toBe('string');
  });

  test('device not found: throws UnknownDeviceError', async () => {
    const repo = makeDeviceRepo(async () => null);

    await expect(resolveDeviceId('690106149138', repo)).rejects.toThrow(UnknownDeviceError);
  });

  test('thrown error is instanceof UnknownDeviceError and carries .terminalId', async () => {
    const repo = makeDeviceRepo(async () => null);

    let caught;
    try {
      await resolveDeviceId('690106149138', repo);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(UnknownDeviceError);
    expect(caught.terminalId).toBe('690106149138');
  });

  test('error message contains the terminalId for debugging', async () => {
    const repo = makeDeviceRepo(async () => null);

    await expect(resolveDeviceId('690106149138', repo)).rejects.toThrow(/690106149138/);
  });

  test('findOne is called with the exact { where: { terminal_id } } query shape', async () => {
    const repo = makeDeviceRepo(async () => ({ id: '42', terminal_id: '690106149138' }));

    await resolveDeviceId('690106149138', repo);

    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { terminal_id: '690106149138' } });
  });
});
