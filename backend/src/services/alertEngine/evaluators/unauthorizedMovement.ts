import type { AlertRule } from "../../../entity/alertRule";
import type { PositionContext } from "../index";
import type { AlertFireRequest } from "../alertFirer";

// Phase 2 stub: fire when a vehicle in "parked"/"after-hours" state moves
// outside its allowed window (rule.config.allowed_hours, etc.).
export async function unauthorizedMovementEvaluator(
  _rule: AlertRule,
  _ctx: PositionContext,
): Promise<AlertFireRequest[]> {
  return [];
}
