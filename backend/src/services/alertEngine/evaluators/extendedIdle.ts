import type { AlertRule } from "../../../entity/alertRule";
import type { EventContext } from "../index";
import type { AlertFireRequest } from "../alertFirer";

// Phase 4 stub: fire when EXTENDED_IDLE event arrives and idle exceeds rule
// config.idle_minutes_threshold.
export async function extendedIdleEvaluator(
  _rule: AlertRule,
  _ctx: EventContext,
): Promise<AlertFireRequest[]> {
  return [];
}
