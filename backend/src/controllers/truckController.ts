import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Trucks } from "../entity/truck";
import { Devices } from "../entity/device";
import { Position } from "../entity/position";
import { detectEvents } from "../services/eventDetection";

const truckRepo = () => AppDataSource.getRepository(Trucks);
const deviceRepo = () => AppDataSource.getRepository(Devices);
const positionRepo = () => AppDataSource.getRepository(Position);

const parseIsoDate = (raw: unknown, label: string): Date | { error: string } => {
  const s = String(raw);
  const d = new Date(s);
  if (isNaN(d.getTime())) return { error: `${label} must be an ISO-8601 timestamp` };
  return d;
};

export const getAllTrucks = async (_req: Request, res: Response) => {
  try {
    const trucks = await truckRepo().find({ order: { id: "ASC" } });
    res.json(trucks);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch trucks", error: error?.message });
  }
};

export const getTruckById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: "id must be a positive integer" });
    }
    const truck = await truckRepo().findOneBy({ id });
    if (!truck) return res.status(404).json({ message: "Truck not found" });
    res.json(truck);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch truck", error: error?.message });
  }
};

// GET /api/trucks/:id/events?from=ISO&to=ISO
// Runs detection per WIRED device assigned to the truck; returns merged events
// sorted by time DESC. Asset trackers contribute no events.
export const getTruckEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: "id must be a positive integer" });
    }
    if (!from || !to) {
      return res.status(400).json({ message: "from and to are required" });
    }
    const fromDate = parseIsoDate(from, "from");
    if (!(fromDate instanceof Date)) return res.status(400).json({ message: (fromDate as { error: string }).error });
    const toDate = parseIsoDate(to, "to");
    if (!(toDate instanceof Date)) return res.status(400).json({ message: (toDate as { error: string }).error });

    const truck = await truckRepo().findOneBy({ id });
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    const devices = await deviceRepo().find({ where: { truck_id: id } });
    if (devices.length === 0) return res.json([]);

    const merged: any[] = [];
    for (const d of devices) {
      // Skip non-WIRED early to save a DB round trip. detectEvents would
      // return [] anyway but no point fetching positions we won't use.
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
    res.status(500).json({ message: "Failed to fetch truck events", error: error?.message });
  }
};
