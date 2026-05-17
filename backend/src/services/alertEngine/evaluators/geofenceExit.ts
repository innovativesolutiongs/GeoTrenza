import type { AlertRule } from "../../../entity/alertRule";
import type { PositionContext } from "../index";
import type { AlertFireRequest } from "../alertFirer";

// Phase 2 stub.
export async function geofenceExitEvaluator(
  _rule: AlertRule,
  _ctx: PositionContext,
): Promise<AlertFireRequest[]> {
  return [];
}
