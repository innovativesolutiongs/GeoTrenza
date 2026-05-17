import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Devices } from "../entity/device";

// "Gateways" is the UI term for the `devices` table (per Stage 3e spec —
// database stays as `devices` internally, frontend says "gateways").

const gatewayRepo = () => AppDataSource.getRepository(Devices);

const VALID_TYPES = new Set(["WIRED", "MAGNETIC_BATTERY", "ASSET_TRACKER"]);
const VALID_STATUSES = new Set([
  "IN_STOCK","ASSIGNED","ACTIVE","INACTIVE","RETURNED","DECOMMISSIONED",
]);

// GET /api/gateways?account_id=&inventory_status=
export const listGateways = async (req: Request, res: Response) => {
  try {
    const { account_id, inventory_status } = req.query;
    const qb = gatewayRepo()
      .createQueryBuilder("d")
      .where("d.deleted_at IS NULL");
    if (account_id) qb.andWhere("d.account_id = :a", { a: String(account_id) });
    if (inventory_status) qb.andWhere("d.inventory_status = :s", { s: String(inventory_status) });
    qb.orderBy("d.id", "ASC");
    res.json(await qb.getMany());
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list gateways", error: error?.message });
  }
};

// POST /api/gateways
export const createGateway = async (req: Request, res: Response) => {
  try {
    const { terminal_id, auth_code, model, device_type, imei, firmware_version, inventory_status } = req.body ?? {};
    if (!terminal_id || !/^[0-9]{12}$/.test(terminal_id)) {
      return res.status(400).json({ message: "terminal_id must be exactly 12 digits" });
    }
    if (!auth_code) return res.status(400).json({ message: "auth_code is required" });
    if (!model) return res.status(400).json({ message: "model is required" });
    if (!device_type || !VALID_TYPES.has(device_type)) {
      return res.status(400).json({ message: `device_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    if (inventory_status && !VALID_STATUSES.has(inventory_status)) {
      return res.status(400).json({ message: `inventory_status must be one of ${[...VALID_STATUSES].join(", ")}` });
    }
    const dupe = await gatewayRepo().findOne({ where: { terminal_id, deleted_at: IsNull() } });
    if (dupe) return res.status(400).json({ message: "A gateway with this terminal_id already exists" });

    const now = new Date();
    const g = gatewayRepo().create({
      terminal_id,
      auth_code,
      model,
      device_type,
      imei: imei ?? null,
      firmware_version: firmware_version ?? null,
      account_id: null,
      vehicle_id: null,
      inventory_status: inventory_status ?? "IN_STOCK",
      last_seen_at: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    const saved = await gatewayRepo().save(g);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create gateway", error: error?.message });
  }
};

// GET /api/gateways/:id
export const getGatewayById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const g = await gatewayRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!g) return res.status(404).json({ message: "Gateway not found" });
    res.json(g);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch gateway", error: error?.message });
  }
};

// PUT /api/gateways/:id
export const updateGateway = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const g = await gatewayRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!g) return res.status(404).json({ message: "Gateway not found" });
    const allowed = ["model","device_type","imei","firmware_version","inventory_status","auth_code"];
    for (const k of allowed) {
      if (k in req.body) (g as any)[k] = req.body[k];
    }
    if (req.body.device_type && !VALID_TYPES.has(req.body.device_type)) {
      return res.status(400).json({ message: `device_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    if (req.body.inventory_status && !VALID_STATUSES.has(req.body.inventory_status)) {
      return res.status(400).json({ message: `inventory_status must be one of ${[...VALID_STATUSES].join(", ")}` });
    }
    const saved = await gatewayRepo().save(g);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update gateway", error: error?.message });
  }
};

// POST /api/gateways/:id/assign-customer  body: { account_id }
export const assignGatewayCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { account_id } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (!account_id || !/^\d+$/.test(String(account_id))) {
      return res.status(400).json({ message: "account_id is required" });
    }
    const r = await gatewayRepo().update(
      { id, deleted_at: IsNull() },
      { account_id: String(account_id), inventory_status: "ASSIGNED" }
    );
    if (r.affected === 0) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway assigned to customer" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign gateway", error: error?.message });
  }
};

// POST /api/gateways/:id/unassign-customer  requires { confirm: true, confirmation_text: "UNASSIGN" }
export const unassignGatewayCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm, confirmation_text } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (confirm !== true || confirmation_text !== "UNASSIGN") {
      return res.status(400).json({
        message: "Confirmation required",
        hint: "Send body { confirm: true, confirmation_text: 'UNASSIGN' }",
      });
    }
    const r = await gatewayRepo().update(
      { id, deleted_at: IsNull() },
      { account_id: null, vehicle_id: null, inventory_status: "IN_STOCK" }
    );
    if (r.affected === 0) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway unassigned (returned to inventory)" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to unassign gateway", error: error?.message });
  }
};

// POST /api/gateways/:id/assign-vehicle  body: { vehicle_id }
export const assignGatewayVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (!vehicle_id || !/^\d+$/.test(String(vehicle_id))) {
      return res.status(400).json({ message: "vehicle_id is required" });
    }
    const r = await gatewayRepo().update(
      { id, deleted_at: IsNull() },
      { vehicle_id: String(vehicle_id), inventory_status: "ACTIVE" }
    );
    if (r.affected === 0) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway assigned to vehicle" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign gateway", error: error?.message });
  }
};

// POST /api/gateways/:id/unassign-vehicle
export const unassignGatewayVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await gatewayRepo().update(
      { id, deleted_at: IsNull() },
      { vehicle_id: null, inventory_status: "ASSIGNED" }
    );
    if (r.affected === 0) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway unassigned from vehicle" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to unassign gateway", error: error?.message });
  }
};

// DELETE /api/gateways/:id (soft)
export const deleteGateway = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await gatewayRepo().update({ id }, { deleted_at: new Date() });
    if (r.affected === 0) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete gateway", error: error?.message });
  }
};
