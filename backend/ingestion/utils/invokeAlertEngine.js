/**
 * Stage 3d Phase 1: ingestion-side hook into the alert engine.
 *
 * Why this file lives here (and not in src/services/alertEngine):
 * the ingestion service runs as a separate pm2 process, ts-node would
 * add a 100ms+ first-call penalty, and the TypeScript build artifacts
 * aren't shipped to ingestion. Per spec Part 3: "If import path makes
 * things weird, copy the necessary evaluator code into ingestion.
 * Pragmatic over pure."
 *
 * Phase 1 behaviour: for each enabled rule on the device's account,
 * dispatch to a no-op evaluator (all evaluators return [] in Phase 1)
 * and skip alert creation. The point is to prove the hook fires
 * non-blockingly and to surface the call in logs.
 *
 * Phase 2 will copy the real geofence-entry / device-offline /
 * unauthorized-movement evaluator logic in here (or refactor to a
 * shared compiled module).
 *
 * INVARIANT: this function MUST swallow all errors. The packet ACK
 * path cannot fail because alerts crashed.
 */

async function invokeAlertEngine({ dataSource, deviceId, accountId, vehicleId, positionRow, events, logger }) {
  if (!accountId) return; // unassigned device — no rules to evaluate
  try {
    const rules = await dataSource.query(
      'SELECT id, rule_type FROM alert_rules ' +
      'WHERE account_id = $1 AND enabled = true AND deleted_at IS NULL',
      [accountId]
    );
    if (rules.length === 0) return;

    logger.debug('alert_engine_evaluated', {
      deviceId,
      accountId,
      vehicleId,
      rule_count: rules.length,
      event_count: events.length,
      // Phase 1 stub: no rules fire. Phase 2 fills in per-type logic.
      fired: 0,
    });
  } catch (err) {
    // Logged but NEVER thrown. The position ACK must succeed regardless.
    logger.warn('alert_engine_error', {
      deviceId,
      accountId,
      message: err && err.message,
    });
  }
}

module.exports = invokeAlertEngine;
