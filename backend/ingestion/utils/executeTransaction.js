const Position = require('../entities/Position');
const Event = require('../entities/Event');
const Device = require('../entities/Device');

async function executeTransaction(positionData, events, deviceId, queryRunner) {
  await queryRunner.startTransaction();
  try {
    const positionResult = await queryRunner.manager.insert(Position, positionData);
    const positionId = positionResult.identifiers[0].id;

    if (events.length > 0) {
      const eventsWithPositionId = events.map((e) => ({ ...e, position_id: positionId }));
      await queryRunner.manager.insert(Event, eventsWithPositionId);
    }

    await queryRunner.manager.update(Device, deviceId, {
      last_seen_at: positionData.received_at,
    });

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  }
}

module.exports = executeTransaction;
