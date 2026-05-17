import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Geofence } from "../entity/geofence";

const geofenceRepo = () => AppDataSource.getRepository(Geofence);

// Accepts GeoJSON polygon and inserts it via PostGIS ST_GeomFromGeoJSON. Phase 1
// just persists rows; the Phase 4 builder UI generates the GeoJSON.
function toPostgisGeomSql(geojson: unknown): { sql: string; param: string } {
  return {
    sql: "ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)",
    param: JSON.stringify(geojson),
  };
}

// POST /api/geofences  body: { account_id, name, geometry: GeoJSON, description?, color?, trigger_on_enter?, trigger_on_exit?, active? }
export const createGeofence = async (req: Request, res: Response) => {
  try {
    const { account_id, name, geometry, description, color, trigger_on_enter, trigger_on_exit, active } = req.body ?? {};
    if (!account_id || !/^\d+$/.test(String(account_id))) {
      return res.status(400).json({ message: "account_id is required" });
    }
    if (!name) return res.status(400).json({ message: "name is required" });
    if (!geometry || typeof geometry !== "object") {
      return res.status(400).json({ message: "geometry (GeoJSON polygon) is required" });
    }
    const { sql: geomSql, param: geomJson } = toPostgisGeomSql(geometry);
    const inserted = await AppDataSource.query(
      `INSERT INTO "geofences"
         ("account_id","name","description","color","geometry","trigger_on_enter","trigger_on_exit","active","deleted_at","created_at","updated_at")
       VALUES ($2,$3,$4,$5,${geomSql},$6,$7,$8,NULL,now(),now())
       RETURNING "id","account_id","name","description","color","trigger_on_enter","trigger_on_exit","active","created_at","updated_at"`,
      [
        geomJson,
        String(account_id),
        name,
        description ?? null,
        color ?? "#3b82f6",
        trigger_on_enter ?? true,
        trigger_on_exit ?? true,
        active ?? true,
      ],
    );
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create geofence", error: error?.message });
  }
};

// GET /api/geofences?account_id=X  — returns rows with geometry as GeoJSON.
export const listGeofences = async (req: Request, res: Response) => {
  try {
    const { account_id } = req.query;
    const params: any[] = [];
    let where = `"deleted_at" IS NULL`;
    if (account_id) {
      params.push(String(account_id));
      where += ` AND "account_id" = $${params.length}`;
    }
    const rows = await AppDataSource.query(
      `SELECT "id","account_id","name","description","color",
              ST_AsGeoJSON("geometry")::jsonb AS "geometry",
              "trigger_on_enter","trigger_on_exit","active","created_at","updated_at"
         FROM "geofences" WHERE ${where}
        ORDER BY "id" DESC`,
      params,
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list geofences", error: error?.message });
  }
};

// GET /api/geofences/:id
export const getGeofenceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const rows = await AppDataSource.query(
      `SELECT "id","account_id","name","description","color",
              ST_AsGeoJSON("geometry")::jsonb AS "geometry",
              "trigger_on_enter","trigger_on_exit","active","created_at","updated_at"
         FROM "geofences" WHERE "id" = $1 AND "deleted_at" IS NULL`,
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ message: "Geofence not found" });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch geofence", error: error?.message });
  }
};

// PUT /api/geofences/:id
export const updateGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const g = await geofenceRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!g) return res.status(404).json({ message: "Geofence not found" });
    // Geometry replacement requires raw SQL because TypeORM can't bind the ST_* call.
    if (req.body.geometry) {
      const { sql: geomSql, param: geomJson } = toPostgisGeomSql(req.body.geometry);
      await AppDataSource.query(
        `UPDATE "geofences" SET "geometry" = ${geomSql}, "updated_at" = now() WHERE "id" = $2`,
        [geomJson, id],
      );
    }
    const allowed = ["name","description","color","trigger_on_enter","trigger_on_exit","active"];
    for (const k of allowed) if (k in req.body) (g as any)[k] = req.body[k];
    const saved = await geofenceRepo().save(g);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update geofence", error: error?.message });
  }
};

// DELETE /api/geofences/:id (soft)
export const deleteGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await geofenceRepo().update({ id } as any, { deleted_at: new Date() } as any);
    if (r.affected === 0) return res.status(404).json({ message: "Geofence not found" });
    res.json({ message: "Geofence soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete geofence", error: error?.message });
  }
};
