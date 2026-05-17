/**
 * Prevents the same (rule_id, vehicle_id) combination from firing repeatedly
 * while an earlier alert is still ACTIVE. Lookup is indexed by
 * alerts_rule_triggered_at_idx; the WHERE clause keeps it cheap.
 *
 * Behaviour matrix (see Stage 3d Phase 1 spec, Part 6):
 *   ACTIVE within window     → suppress
 *   ACKNOWLEDGED, any time   → DO NOT suppress (treated as cleared)
 *   SNOOZED before snooze_until → suppress
 *   MUTED                    → suppress indefinitely
 *   no prior alert OR > window → fire fresh
 */
import { AppDataSource } from "../../ormconfig";
import { Alert } from "../../entity/alert";
import { IsNull } from "typeorm";

const DEFAULT_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const alertRepo = () => AppDataSource.getRepository(Alert);

export interface DedupQuery {
  rule_id: string;
  vehicle_id: string | null;
  now?: Date;
  windowMs?: number;
}

export const deduplicator = {
  // Returns true if the alert should be suppressed.
  async shouldSuppress(q: DedupQuery): Promise<boolean> {
    const now = q.now ?? new Date();
    const windowMs = q.windowMs ?? DEFAULT_DEDUP_WINDOW_MS;
    const windowStart = new Date(now.getTime() - windowMs);

    const qb = alertRepo()
      .createQueryBuilder("a")
      .where("a.rule_id = :rid", { rid: q.rule_id })
      .andWhere("a.deleted_at IS NULL");

    if (q.vehicle_id === null) {
      qb.andWhere("a.vehicle_id IS NULL");
    } else {
      qb.andWhere("a.vehicle_id = :vid", { vid: q.vehicle_id });
    }

    qb.orderBy("a.triggered_at", "DESC").limit(1);

    const recent = await qb.getOne();
    if (!recent) return false;

    // MUTED — indefinitely suppressed until manually unmuted by the user.
    if (recent.status === "MUTED") return true;

    // SNOOZED — suppress only while snooze_until is still in the future.
    if (recent.status === "SNOOZED") {
      if (recent.snoozed_until && recent.snoozed_until.getTime() > now.getTime()) return true;
      return false;
    }

    // ACTIVE — suppress only if within the dedup window. Outside the window
    // we let a fresh alert fire (user clearly hasn't dealt with it but
    // the noise should refresh visibility).
    if (recent.status === "ACTIVE") {
      return recent.triggered_at.getTime() > windowStart.getTime();
    }

    // ACKNOWLEDGED / RESOLVED — explicitly cleared, do not suppress.
    return false;
  },
};

// Exposed for tests so they don't have to copy the constant.
export const DEDUP_WINDOW_MS = DEFAULT_DEDUP_WINDOW_MS;
// Keep IsNull imported just in case future evolvers need it without re-finding the import.
void IsNull;
