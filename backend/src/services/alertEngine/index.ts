/**
 * Stage 3d Phase 1 alert engine — public API.
 *
 * Three entrypoints:
 *  - evaluateRulesForPosition: called by ingestion handle0x0200 after each
 *    position INSERT. Walks rules whose rule_type is position-driven.
 *  - evaluateRulesForEvent: called by event detection (ARRIVAL/DEPARTURE/
 *    EXTENDED_IDLE etc.) after an event row is persisted.
 *  - evaluateScheduledRules: cron entrypoint for time-based rules like
 *    DEVICE_OFFLINE > N minutes. Phase 1 returns []; Phase 2 wires real logic.
 *
 * Phase 1 reality: every evaluator stub returns []. The plumbing (dedup,
 * firing, delivery dispatch) is exercised by the STUB_TEST rule type via
 * POST /api/alert-rules/:id/test, which synthesises an alert directly.
 */
import { ruleEvaluator } from "./ruleEvaluator";
import { alertFirer } from "./alertFirer";

export interface PositionContext {
  position_id: string;
  device_id: string;
  vehicle_id: string | null;
  account_id: string;
  lat: number;
  lng: number;
  speed_kph: number | null;
  recorded_at: Date;
}

export interface EventContext {
  event_id: string;
  kind: string;
  device_id: string;
  vehicle_id: string | null;
  account_id: string;
  at: Date;
  details?: Record<string, unknown>;
}

export async function evaluateRulesForPosition(ctx: PositionContext): Promise<void> {
  const fires = await ruleEvaluator.dispatchPosition(ctx);
  for (const f of fires) await alertFirer.fire(f);
}

export async function evaluateRulesForEvent(ctx: EventContext): Promise<void> {
  const fires = await ruleEvaluator.dispatchEvent(ctx);
  for (const f of fires) await alertFirer.fire(f);
}

export async function evaluateScheduledRules(): Promise<void> {
  const fires = await ruleEvaluator.dispatchScheduled();
  for (const f of fires) await alertFirer.fire(f);
}

export { alertFirer };
export type { AlertFireRequest } from "./alertFirer";
