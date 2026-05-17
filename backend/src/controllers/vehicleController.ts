import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Vehicles } from "../entity/vehicle";
import { Devices } from "../entity/device";
import { Position } from "../entity/position";
import { detectEvents } from "../services/eventDetection";

const vehicleRepo = () => AppDataSource.getRepository(Vehicles);
const deviceRepo = () => AppDataSource.getRepository(Devices);
const positionRepo = () => AppDataSource.getRepository(Position);

const VALID_TYPES = new Set([
  "Truck","Trailer","Car","Van","Bus","Generator","Container","Heavy Equipment","Other",
]);

const parseIsoDate = (raw: unknown, label: string): Date | { error: string } => {
  const s = String(raw);
  const d = new Date(s);
  if (isNaN(d.getTime())) return { error: `${label} must be an ISO-8601 timestamp` };
  return d;
};

// ---------- LIST ----------

export const getAllVehicles = async (_req: Request, res: Response) => {
  try {
    const rows = await vehicleRepo().find({ where: { deleted_at: IsNull() }, order: { id: "ASC" } });
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch vehicles", error: error?.message });
  }
};

// GET /api/customers/:customerId/vehicles
export const getVehiclesForCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    if (!/^\d+$/.test(customerId)) return res.status(400).json({ message: "customerId must be a positive integer" });
    const rows = await vehicleRepo().find({
      where: { account_id: customerId, deleted_at: IsNull() },
      order: { id: "ASC" },
    });
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch vehicles", error: error?.message });
  }
};

// ---------- DETAIL ----------

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const v = await vehicleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!v) return res.status(404).json({ message: "Vehicle not found" });
    const devices = await deviceRepo().find({ where: { vehicle_id: id, deleted_at: IsNull() } });
    res.json({ ...v, devices });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch vehicle", error: error?.message });
  }
};

// ---------- CREATE / UPDATE / DELETE ----------

export const createVehicleForCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    if (!/^\d+$/.test(customerId)) return res.status(400).json({ message: "customerId must be a positive integer" });
    const { registration_no, name, model, vin, year, make, manufacturer, vehicle_type, metadata, status } = req.body ?? {};
    if (!registration_no) return res.status(400).json({ message: "registration_no is required" });
    if (vehicle_type && !VALID_TYPES.has(vehicle_type)) {
      return res.status(400).json({ message: `vehicle_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    const v = vehicleRepo().create({
      account_id: customerId,
      registration_no,
      name: name ?? null,
      model: model ?? null,
      vin: vin ?? null,
      year: year ?? null,
      make: make ?? null,
      manufacturer: manufacturer ?? null,
      vehicle_type: vehicle_type ?? "Truck",
      metadata: metadata ?? null,
      status: status ?? "active",
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await vehicleRepo().save(v);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create vehicle", error: error?.message });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const v = await vehicleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!v) return res.status(404).json({ message: "Vehicle not found" });
    const allowed = ["registration_no","name","model","vin","year","make","manufacturer","vehicle_type","metadata","status"];
    for (const k of allowed) {
      if (k in req.body) (v as any)[k] = req.body[k];
    }
    if (req.body.vehicle_type && !VALID_TYPES.has(req.body.vehicle_type)) {
      return res.status(400).json({ message: `vehicle_type must be one of ${[...VALID_TYPES].join(", ")}` });
    }
    const saved = await vehicleRepo().save(v);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update vehicle", error: error?.message });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await vehicleRepo().update({ id }, { deleted_at: new Date() });
    if (r.affected === 0) return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: "Vehicle deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete vehicle", error: error?.message });
  }
};

// ---------- EVENTS (preserved from Stage 3c) ----------

export const getVehicleEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });
    const fromDate = parseIsoDate(from, "from");
    if (!(fromDate instanceof Date)) return res.status(400).json({ message: (fromDate as { error: string }).error });
    const toDate = parseIsoDate(to, "to");
    if (!(toDate instanceof Date)) return res.status(400).json({ message: (toDate as { error: string }).error });

    const v = await vehicleRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!v) return res.status(404).json({ message: "Vehicle not found" });
    const devices = await deviceRepo().find({ where: { vehicle_id: id, deleted_at: IsNull() } });
    if (devices.length === 0) return res.json([]);
    const merged: any[] = [];
    for (const d of devices) {
      if (d.device_type !== "WIRED") continue;
      const positions = await positionRepo()
        .createQueryBuilder("p")
        .where("p.device_id = :did", { did: d.id })
        .andWhere("p.recorded_at >= :from", { from: fromDate.toISOString() })
        .andWhere("p.recorded_at <= :to", { to: toDate.toISOString() })
        .orderBy("p.recorded_at", "ASC")
        .getMany();
      const events = detectEvents(positions as any, d.device_type);
      for (const ev of events) merged.push({ ...ev, device_type: d.device_type });
    }
    merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch vehicle events", error: error?.message });
  }
};
