import type { AlertRule } from "../../../entity/alertRule";
import type { PositionContext } from "../index";
import type { AlertFireRequest } from "../alertFirer";

// Phase 2 will read geofence geometry, ST_Contains check, fire if entering.
// Phase 1 stub.
export async function geofenceEntryEvaluator(
  _rule: AlertRule,
  _ctx: PositionContext,
): Promise<AlertFireRequest[]> {
  return [];
}
