import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { AlertSubscription, type AlertChannel } from "../entity/alertSubscription";

const subRepo = () => AppDataSource.getRepository(AlertSubscription);

const VALID_CHANNELS = new Set(["IN_APP","WHATSAPP","EMAIL","SMS"]);
const VALID_SEVERITIES = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);

// GET /api/users/:userId/alert-subscriptions
export const listSubscriptionsForUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!/^\d+$/.test(userId)) return res.status(400).json({ message: "userId must be a positive integer" });
    const rows = await subRepo().find({ where: { user_id: userId }, order: { id: "ASC" } });
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list subscriptions", error: error?.message });
  }
};

// POST /api/users/:userId/alert-subscriptions  body: { rule_id?, channels[], min_severity? }
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!/^\d+$/.test(userId)) return res.status(400).json({ message: "userId must be a positive integer" });
    const { rule_id, channels, min_severity } = req.body ?? {};
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ message: "channels[] is required" });
    }
    for (const c of channels) {
      if (!VALID_CHANNELS.has(c)) return res.status(400).json({ message: `channels must be subset of ${[...VALID_CHANNELS].join(", ")}` });
    }
    if (min_severity && !VALID_SEVERITIES.has(min_severity)) {
      return res.status(400).json({ message: `min_severity must be one of ${[...VALID_SEVERITIES].join(", ")}` });
    }
    const s = subRepo().create({
      user_id: userId,
      rule_id: rule_id ? String(rule_id) : null,
      channels: channels as AlertChannel[],
      min_severity: min_severity ?? "LOW",
      snooze_until: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await subRepo().save(s);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create subscription", error: error?.message });
  }
};

// PUT /api/alert-subscriptions/:id
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const s = await subRepo().findOne({ where: { id } });
    if (!s) return res.status(404).json({ message: "Subscription not found" });
    if ("channels" in req.body) {
      const channels = req.body.channels;
      if (!Array.isArray(channels) || channels.length === 0) {
        return res.status(400).json({ message: "channels[] must be a non-empty array" });
      }
      for (const c of channels) {
        if (!VALID_CHANNELS.has(c)) return res.status(400).json({ message: `channels must be subset of ${[...VALID_CHANNELS].join(", ")}` });
      }
      s.channels = channels;
    }
    if ("min_severity" in req.body) {
      if (!VALID_SEVERITIES.has(req.body.min_severity)) {
        return res.status(400).json({ message: `min_severity must be one of ${[...VALID_SEVERITIES].join(", ")}` });
      }
      s.min_severity = req.body.min_severity;
    }
    if ("snooze_until" in req.body) {
      s.snooze_until = req.body.snooze_until ? new Date(req.body.snooze_until) : null;
    }
    const saved = await subRepo().save(s);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update subscription", error: error?.message });
  }
};

// DELETE /api/alert-subscriptions/:id  (hard delete — preferences are user-owned)
export const deleteSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await subRepo().delete({ id } as any);
    if (r.affected === 0) return res.status(404).json({ message: "Subscription not found" });
    res.json({ message: "Subscription deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete subscription", error: error?.message });
  }
};
