import { Request, Response } from "express";
import { SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Position } from "../entity/position";

const positionRepo = () => AppDataSource.getRepository(Position);

const parseLimit = (raw: unknown, def: number, max: number): number | { error: string } => {
  if (raw === undefined) return def;
  const s = String(raw);
  if (!/^\d+$/.test(s)) return { error: "limit must be a positive integer" };
  const n = parseInt(s, 10);
  if (n < 1) return { error: "limit must be >= 1" };
  if (n > max) return { error: `limit must be <= ${max}` };
  return n;
};

const parseIsoDate = (raw: unknown, label: string): Date | { error: string } => {
  const s = String(raw);
  const d = new Date(s);
  if (isNaN(d.getTime())) return { error: `${label} must be an ISO-8601 timestamp` };
  return d;
};

// Run a positions query that also pulls device_type from the joined devices
// row. Returns each position as a flat object with `device_type` appended.
// device_type is NOT NULL in the schema (default 'WIRED'), but we coerce a
// NULL from a missing FK row to 'WIRED' as a defensive fallback.
const fetchWithDeviceType = async (qb: SelectQueryBuilder<Position>) => {
  qb.leftJoin("devices", "d", "d.id = p.device_id").addSelect("d.device_type", "p_device_type");
  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((e, i) => ({
    ...e,
    device_type: raw[i].p_device_type ?? "WIRED",
  }));
};

// GET /api/positions/latest?limit=N
// Most recent position per device, with device_type joined in.
export const getLatestPositions = async (req: Request, res: Response) => {
  try {
    const limitParsed = parseLimit(req.query.limit, 100, 1000);
    if (typeof limitParsed !== "number") return res.status(400).json({ message: limitParsed.error });

    const qb = positionRepo()
      .createQueryBuilder("p")
      .distinctOn(["p.device_id"])
      .orderBy("p.device_id", "ASC")
      .addOrderBy("p.recorded_at", "DESC")
      .limit(limitParsed);

    res.json(await fetchWithDeviceType(qb));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch latest positions", error: error?.message });
  }
};

// GET /api/positions?device_id=X&from=ISO&to=ISO
export const getPositionsForDevice = async (req: Request, res: Response) => {
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

    const qb = positionRepo()
      .createQueryBuilder("p")
      .where("p.device_id = :deviceId", { deviceId: deviceIdStr })
      .andWhere("p.recorded_at >= :from", { from: (fromDate as Date).toISOString() })
      .andWhere("p.recorded_at <= :to", { to: (toDate as Date).toISOString() })
      .orderBy("p.recorded_at", "ASC");

    res.json(await fetchWithDeviceType(qb));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch positions", error: error?.message });
  }
};
