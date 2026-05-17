/**
 * Dispatches incoming context (Position / Event / scheduled tick) to the
 * evaluator function matched by alert_rules.rule_type. Phase 1 evaluators
 * are stubs returning [] — the real logic lands in Phase 2 (geofence,
 * device offline, unauthorized movement) and Phase 4 (idle, speed).
 */
import { AppDataSource } from "../../ormconfig";
import { AlertRule } from "../../entity/alertRule";
import { IsNull } from "typeorm";
import type { PositionContext, EventContext } from "./index";
import type { AlertFireRequest } from "./alertFirer";

import { geofenceEntryEvaluator } from "./evaluators/geofenceEntry";
import { geofenceExitEvaluator } from "./evaluators/geofenceExit";
import { deviceOfflineEvaluator } from "./evaluators/deviceOffline";
import { extendedIdleEvaluator } from "./evaluators/extendedIdle";
import { speedViolationEvaluator } from "./evaluators/speedViolation";
import { unauthorizedMovementEvaluator } from "./evaluators/unauthorizedMovement";

// Position-driven rule types
const POSITION_TYPES = new Set([
  "GEOFENCE_ENTRY",
  "GEOFENCE_EXIT",
  "SPEED_VIOLATION",
  "UNAUTHORIZED_MOVEMENT",
]);

// Event-driven rule types (ARRIVAL/DEPARTURE/EXTENDED_IDLE)
const EVENT_TYPES = new Set(["EXTENDED_IDLE"]);

// Scheduled (cron) rule types
const SCHEDULED_TYPES = new Set(["DEVICE_OFFLINE"]);

const ruleRepo = () => AppDataSource.getRepository(AlertRule);

async function fetchEnabledRules(accountId: string, typeSet: Set<string>): Promise<AlertRule[]> {
  const rows = await ruleRepo().find({
    where: { account_id: accountId, enabled: true, deleted_at: IsNull() },
  });
  return rows.filter((r) => typeSet.has(r.rule_type));
}

export const ruleEvaluator = {
  async dispatchPosition(ctx: PositionContext): Promise<AlertFireRequest[]> {
    const rules = await fetchEnabledRules(ctx.account_id, POSITION_TYPES);
    const fires: AlertFireRequest[] = [];
    for (const r of rules) {
      // Honour scope=VEHICLE narrowing before invoking evaluator
      if (r.scope === "VEHICLE" && r.target_vehicle_ids && ctx.vehicle_id) {
        if (!r.target_vehicle_ids.includes(ctx.vehicle_id)) continue;
      }
      switch (r.rule_type) {
        case "GEOFENCE_ENTRY":
          fires.push(...(await geofenceEntryEvaluator(r, ctx)));
          break;
        case "GEOFENCE_EXIT":
          fires.push(...(await geofenceExitEvaluator(r, ctx)));
          break;
        case "SPEED_VIOLATION":
          fires.push(...(await speedViolationEvaluator(r, ctx)));
          break;
        case "UNAUTHORIZED_MOVEMENT":
          fires.push(...(await unauthorizedMovementEvaluator(r, ctx)));
          break;
      }
    }
    return fires;
  },

  async dispatchEvent(ctx: EventContext): Promise<AlertFireRequest[]> {
    const rules = await fetchEnabledRules(ctx.account_id, EVENT_TYPES);
    const fires: AlertFireRequest[] = [];
    for (const r of rules) {
      if (r.scope === "VEHICLE" && r.target_vehicle_ids && ctx.vehicle_id) {
        if (!r.target_vehicle_ids.includes(ctx.vehicle_id)) continue;
      }
      if (r.rule_type === "EXTENDED_IDLE") {
        fires.push(...(await extendedIdleEvaluator(r, ctx)));
      }
    }
    return fires;
  },

  async dispatchScheduled(): Promise<AlertFireRequest[]> {
    // Cron entrypoint — Phase 2 will invoke device-offline evaluator per
    // account. For Phase 1, we just stub.
    const fires: AlertFireRequest[] = [];
    const all = await ruleRepo().find({
      where: { enabled: true, deleted_at: IsNull() },
    });
    for (const r of all.filter((r) => SCHEDULED_TYPES.has(r.rule_type))) {
      if (r.rule_type === "DEVICE_OFFLINE") {
        fires.push(...(await deviceOfflineEvaluator(r)));
      }
    }
    return fires;
  },
};
