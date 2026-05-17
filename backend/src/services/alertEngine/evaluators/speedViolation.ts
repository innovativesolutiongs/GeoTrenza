import type { AlertRule } from "../../../entity/alertRule";
import type { PositionContext } from "../index";
import type { AlertFireRequest } from "../alertFirer";

// Phase 4 stub: compare ctx.speed_kph against rule.config.speed_threshold_kph.
export async function speedViolationEvaluator(
  _rule: AlertRule,
  _ctx: PositionContext,
): Promise<AlertFireRequest[]> {
  return [];
}
