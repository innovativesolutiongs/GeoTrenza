import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Alert } from "../entity/alert";

const alertRepo = () => AppDataSource.getRepository(Alert);

// GET /api/alerts?account_id=&status=&vehicle_id=&from=&to=&limit=
export const listAlerts = async (req: Request, res: Response) => {
  try {
    const { account_id, status, vehicle_id, from, to, limit } = req.query;
    const qb = alertRepo().createQueryBuilder("a").where("a.deleted_at IS NULL");
    if (account_id) qb.andWhere("a.account_id = :a", { a: String(account_id) });
    if (status) qb.andWhere("a.status = :s", { s: String(status) });
    if (vehicle_id) qb.andWhere("a.vehicle_id = :v", { v: String(vehicle_id) });
    if (from) qb.andWhere("a.triggered_at >= :f", { f: new Date(String(from)) });
    if (to) qb.andWhere("a.triggered_at <= :t", { t: new Date(String(to)) });
    qb.orderBy("a.triggered_at", "DESC");
    const lim = Math.min(Number(limit ?? 200), 1000);
    qb.limit(lim);
    const rows = await qb.getMany();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list alerts", error: error?.message });
  }
};

// GET /api/alerts/:id
export const getAlertById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const a = await alertRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!a) return res.status(404).json({ message: "Alert not found" });
    res.json(a);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch alert", error: error?.message });
  }
};

// POST /api/alerts/:id/acknowledge  body: { user_id }
export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const a = await alertRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!a) return res.status(404).json({ message: "Alert not found" });
    a.status = "ACKNOWLEDGED";
    a.acknowledged_at = new Date();
    a.acknowledged_by_user_id = user_id ? String(user_id) : null;
    const saved = await alertRepo().save(a);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to acknowledge alert", error: error?.message });
  }
};

// POST /api/alerts/:id/resolve
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const a = await alertRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!a) return res.status(404).json({ message: "Alert not found" });
    a.status = "RESOLVED";
    a.resolved_at = new Date();
    const saved = await alertRepo().save(a);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to resolve alert", error: error?.message });
  }
};

// POST /api/alerts/:id/snooze  body: { until: ISO }
export const snoozeAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { until } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (!until) return res.status(400).json({ message: "until (ISO timestamp) is required" });
    const untilDate = new Date(until);
    if (isNaN(untilDate.getTime()) || untilDate.getTime() <= Date.now()) {
      return res.status(400).json({ message: "until must be a future ISO timestamp" });
    }
    const a = await alertRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!a) return res.status(404).json({ message: "Alert not found" });
    a.status = "SNOOZED";
    a.snoozed_until = untilDate;
    const saved = await alertRepo().save(a);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to snooze alert", error: error?.message });
  }
};

// POST /api/alerts/:id/mute
export const muteAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const a = await alertRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!a) return res.status(404).json({ message: "Alert not found" });
    a.status = "MUTED";
    const saved = await alertRepo().save(a);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to mute alert", error: error?.message });
  }
};

// DELETE /api/alerts/:id (soft) — alerts are immutable history; rare op.
export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await alertRepo().update({ id } as any, { deleted_at: new Date() } as any);
    if (r.affected === 0) return res.status(404).json({ message: "Alert not found" });
    res.json({ message: "Alert soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete alert", error: error?.message });
  }
};
