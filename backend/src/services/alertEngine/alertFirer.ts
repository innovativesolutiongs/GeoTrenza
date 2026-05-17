/**
 * alertFirer
 *
 * Given an AlertFireRequest from an evaluator (or a manual /test endpoint
 * invocation), this:
 *   1. Asks the deduplicator whether to suppress.
 *   2. Persists an Alert row at severity copied from the rule at fire-time
 *      (so subsequent rule edits don't rewrite history).
 *   3. Finds all eligible AlertSubscription rows for the alert's account
 *      and dispatches per-channel deliveries.
 *
 * Delivery errors NEVER bubble. Each channel deliver is wrapped — a SMS
 * outage must not block in-app from showing the alert.
 */
import { AppDataSource } from "../../ormconfig";
import { Alert } from "../../entity/alert";
import { AlertRule, type Severity } from "../../entity/alertRule";
import { AlertSubscription } from "../../entity/alertSubscription";
import { User } from "../../entity/User";
import { deduplicator } from "./deduplicator";
import { inAppChannel } from "./deliveryChannels/inApp";
import { whatsappChannel } from "./deliveryChannels/whatsapp";
import { emailChannel } from "./deliveryChannels/email";
import { smsChannel } from "./deliveryChannels/sms";

export interface AlertFireRequest {
  rule: AlertRule;
  vehicle_id: string | null;
  device_id: string | null;
  title: string;
  description?: string | null;
  payload?: Record<string, unknown> | null;
  triggered_at?: Date;
}

const alertRepo = () => AppDataSource.getRepository(Alert);
const subRepo = () => AppDataSource.getRepository(AlertSubscription);
const userRepo = () => AppDataSource.getRepository(User);

const channels = {
  IN_APP: inAppChannel,
  WHATSAPP: whatsappChannel,
  EMAIL: emailChannel,
  SMS: smsChannel,
} as const;

const SEVERITY_ORDER: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export const alertFirer = {
  async fire(req: AlertFireRequest): Promise<Alert | null> {
    const triggered_at = req.triggered_at ?? new Date();

    const suppress = await deduplicator.shouldSuppress({
      rule_id: req.rule.id,
      vehicle_id: req.vehicle_id,
      now: triggered_at,
    });
    if (suppress) return null;

    const alert = alertRepo().create({
      account_id: req.rule.account_id,
      rule_id: req.rule.id,
      vehicle_id: req.vehicle_id,
      device_id: req.device_id,
      triggered_at,
      // SEVERITY FROZEN: copied here so future rule edits don't rewrite history.
      severity: req.rule.severity,
      title: req.title,
      description: req.description ?? null,
      payload: req.payload ?? null,
      status: "ACTIVE",
      acknowledged_at: null,
      acknowledged_by_user_id: null,
      resolved_at: null,
      snoozed_until: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await alertRepo().save(alert);

    // Fire-and-forget delivery dispatch. Errors are swallowed per-channel.
    void this.dispatchToSubscribers(saved, req.rule);

    return saved;
  },

  async dispatchToSubscribers(alert: Alert, rule: AlertRule): Promise<void> {
    // Find candidate subscriptions: rule-specific OR account-wide (rule_id IS NULL)
    // for users who belong to this account.
    const accountUsers = await userRepo()
      .createQueryBuilder("u")
      .where('u."customerID" = :cid', { cid: Number(rule.account_id) })
      .andWhere("u.deleted_at IS NULL")
      .getMany();
    const userIds = accountUsers.map((u) => String(u.ID));
    if (userIds.length === 0) return;

    const subs = await subRepo()
      .createQueryBuilder("s")
      .where("s.user_id = ANY(:uids)", { uids: userIds.map((i) => Number(i)) })
      .andWhere("(s.rule_id = :rid OR s.rule_id IS NULL)", { rid: rule.id })
      .getMany();

    for (const s of subs) {
      // Skip if alert severity is below the subscription's minimum.
      if (SEVERITY_ORDER[alert.severity] < SEVERITY_ORDER[s.min_severity]) continue;
      // Skip if user-level snooze is active.
      if (s.snooze_until && s.snooze_until.getTime() > Date.now()) continue;

      for (const channelName of s.channels) {
        const ch = channels[channelName];
        if (!ch) continue;
        try {
          await ch.deliver(alert, s.user_id);
        } catch (err) {
          // Channel-level failure must not block other channels or other
          // subscribers. Log to stderr so it surfaces in pm2 logs without
          // pulling in pino here.
          console.error("[alertFirer] channel delivery failed", {
            alert_id: alert.id,
            user_id: s.user_id,
            channel: channelName,
            error: (err as Error)?.message,
          });
        }
      }
    }
  },
};
