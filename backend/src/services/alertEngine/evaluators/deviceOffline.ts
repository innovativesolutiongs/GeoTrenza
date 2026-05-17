import type { AlertRule } from "../../../entity/alertRule";
import type { AlertFireRequest } from "../alertFirer";

// Phase 2 stub: cron will scan devices.last_seen_at < now - threshold.
export async function deviceOfflineEvaluator(_rule: AlertRule): Promise<AlertFireRequest[]> {
  return [];
}
