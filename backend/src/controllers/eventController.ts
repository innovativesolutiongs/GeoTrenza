import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Event } from "../entity/event";

const eventRepo = () => AppDataSource.getRepository(Event);

const parseIsoDate = (raw: unknown, label: string): Date | { error: string } => {
  const s = String(raw);
  const d = new Date(s);
  if (isNaN(d.getTime())) return { error: `${label} must be an ISO-8601 timestamp` };
  return d;
};

// GET /api/events?device_id=X&from=ISO&to=ISO
export const getEventsForDevice = async (req: Request, res: Response) => {
  try {
    const { device_id, from, to } = req.query;
    if (!device_id || !from || !to) {
      return res.status(400).json({ message: "device_id, from, and to are required" });
    }
    const deviceIdStr = String(device_id);
    if (!/^\d+$/.test(deviceIdStr)) {
      return res.status(400).json({ message: "device_id must be a positive integer" });
    }
    const fromDate = parseIsoDate(from, "from");
    if (fromDate instanceof Date === false) return res.status(400).json({ message: (fromDate as { error: string }).error });
    const toDate = parseIsoDate(to, "to");
    if (toDate instanceof Date === false) return res.status(400).json({ message: (toDate as { error: string }).error });

    const rows = await eventRepo()
      .createQueryBuilder("e")
      .where("e.device_id = :deviceId", { deviceId: deviceIdStr })
      .andWhere("e.started_at >= :from", { from: (fromDate as Date).toISOString() })
      .andWhere("e.started_at <= :to", { to: (toDate as Date).toISOString() })
      .orderBy("e.started_at", "DESC")
      .getMany();

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch events", error: error?.message });
  }
};
