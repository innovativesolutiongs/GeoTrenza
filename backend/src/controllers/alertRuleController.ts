import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { AlertRule } from "../entity/alertRule";
import { alertFirer } from "../services/alertEngine";

const ruleRepo = () => AppDataSource.getRepository(AlertRule);

const VALID_TYPES = new Set([
  "GEOFENCE_ENTRY","GEOFENCE_EXIT","DEVICE_OFFLINE","EXTENDED_IDLE",
  "SPEED_VIOLATION","UNAUTHORIZED_MOVEMENT","STUB_TEST",
]);
const VALID_SEVERITIES = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);
const VALID_SCOPES = new Set(["FLEET","VEHICLE","GROUP"]);

// POST /api/alert-rules
export const createAlertRule = async (req: Request, res: Response) => {
  try {
    const {
      account_id, name, description, rule_type, config,
      severity, enabled, scope, target_vehicle_ids, target_geofence_ids,
    } = req.body ?? {};
    if (!account_id || !/^\d+$/.test(String(account_id))) {
      return res.status(400).json({ message: "account_id is required" });
    }
    if (!name) return res.status(400).json({ message: "name is required" });
    if (!rule_type || !VALID_TYPES.has(rule_type)) {
      return res.status(400).json({ message: `rule_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    if (severity && !VALID_SEVERITIES.has(severity)) {
      return res.status(400).json({ message: `severity must be one of ${[...VALID_SEVERITIES].join(", ")}` });
    }
    if (scope && !VALID_SCOPES.has(scope)) {
      return res.status(400).json({ message: `scope must be one of ${[...VALID_SCOPES].join(", ")}` });
    }
    const r = ruleRepo().create({
      account_id: String(account_id),
      name,
      description: description ?? null,
      rule_type,
      config: config ?? {},
      severity: severity ?? "MEDIUM",
      enabled: enabled ?? true,
      scope: scope ?? "FLEET",
      target_vehicle_ids: target_vehicle_ids ?? null,
      target_geofence_ids: target_geofence_ids ?? null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await ruleRepo().save(r);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create alert rule", error: error?.message });
  }
};

// GET /api/alert-rules?account_id=X
export const listAlertRules = async (req: Request, res: Response) => {
  try {
    const { account_id } = req.query;
    const qb = ruleRepo().createQueryBuilder("r").where("r.deleted_at IS NULL");
    if (account_id) qb.andWhere("r.account_id = :a", { a: String(account_id) });
    const rows = await qb.orderBy("r.created_at", "DESC").getMany();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list alert rules", error: error?.message });
  }
};

// GET /api/alert-rules/:id
export const getAlertRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await ruleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!r) return res.status(404).json({ message: "Alert rule not found" });
    res.json(r);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch alert rule", error: error?.message });
  }
};

// PUT /api/alert-rules/:id
export const updateAlertRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await ruleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!r) return res.status(404).json({ message: "Alert rule not found" });
    const allowed = ["name","description","rule_type","config","severity","enabled","scope","target_vehicle_ids","target_geofence_ids"];
    for (const k of allowed) {
      if (k in req.body) (r as any)[k] = req.body[k];
    }
    if (req.body.rule_type && !VALID_TYPES.has(req.body.rule_type)) {
      return res.status(400).json({ message: `rule_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    if (req.body.severity && !VALID_SEVERITIES.has(req.body.severity)) {
      return res.status(400).json({ message: `severity must be one of ${[...VALID_SEVERITIES].join(", ")}` });
    }
    if (req.body.scope && !VALID_SCOPES.has(req.body.scope)) {
      return res.status(400).json({ message: `scope must be one of ${[...VALID_SCOPES].join(", ")}` });
    }
    const saved = await ruleRepo().save(r);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update alert rule", error: error?.message });
  }
};

// DELETE /api/alert-rules/:id (soft)
export const deleteAlertRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await ruleRepo().update({ id } as any, { deleted_at: new Date() } as any);
    if (r.affected === 0) return res.status(404).json({ message: "Alert rule not found" });
    res.json({ message: "Alert rule soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete alert rule", error: error?.message });
  }
};

// POST /api/alert-rules/:id/test  — synthesise an alert for QA. Goes through
// the deduplicator + firer so it exercises the real plumbing.
export const testFireAlertRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const rule = await ruleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!rule) return res.status(404).json({ message: "Alert rule not found" });

    const { vehicle_id, device_id, title, description } = req.body ?? {};
    const fired = await alertFirer.fire({
      rule,
      vehicle_id: vehicle_id ?? null,
      device_id: device_id ?? null,
      title: title ?? `Test fire: ${rule.name}`,
      description: description ?? "Synthetic alert via /test endpoint",
      payload: { synthetic: true, fired_at: new Date().toISOString() },
    });
    if (!fired) return res.status(200).json({ message: "Suppressed by deduplicator (existing ACTIVE alert within 1h)", fired: null });
    res.status(201).json({ message: "Fired", fired });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to test-fire alert rule", error: error?.message });
  }
};
