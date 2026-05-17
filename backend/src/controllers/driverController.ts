import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../ormconfig";
import { Driver } from "../entity/driver";

const driverRepo = () => AppDataSource.getRepository(Driver);

// POST /api/customers/:customerId/drivers
export const createDriverForCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    if (!/^\d+$/.test(customerId)) return res.status(400).json({ message: "customerId must be a positive integer" });
    const { name, phone, email, license_number, license_expiry, hire_date, vehicle_id } = req.body ?? {};
    if (!name) return res.status(400).json({ message: "name is required" });
    const d = driverRepo().create({
      account_id: customerId,
      name,
      phone: phone ?? null,
      email: email ?? null,
      license_number: license_number ?? null,
      license_expiry: license_expiry ?? null,
      hire_date: hire_date ?? null,
      vehicle_id: vehicle_id ?? null,
      status: "ACTIVE",
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await driverRepo().save(d);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create driver", error: error?.message });
  }
};

// GET /api/customers/:customerId/drivers
export const listDriversForCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    if (!/^\d+$/.test(customerId)) return res.status(400).json({ message: "customerId must be a positive integer" });
    const rows = await driverRepo().find({
      where: { account_id: customerId, deleted_at: IsNull() },
      order: { id: "ASC" },
    });
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list drivers", error: error?.message });
  }
};

// GET /api/drivers/:id
export const getDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const d = await driverRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!d) return res.status(404).json({ message: "Driver not found" });
    res.json(d);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch driver", error: error?.message });
  }
};

// PUT /api/drivers/:id
export const updateDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const d = await driverRepo().findOne({ where: { id, deleted_at: IsNull() } });
    if (!d) return res.status(404).json({ message: "Driver not found" });
    const allowed = ["name", "phone", "email", "license_number", "license_expiry", "hire_date", "status"];
    for (const k of allowed) {
      if (k in req.body) (d as any)[k] = req.body[k];
    }
    if (req.body.status && !["ACTIVE", "INACTIVE"].includes(req.body.status)) {
      return res.status(400).json({ message: "status must be ACTIVE or INACTIVE" });
    }
    const saved = await driverRepo().save(d);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update driver", error: error?.message });
  }
};

// POST /api/drivers/:id/assign-vehicle  body: { vehicle_id }
export const assignDriverVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body ?? {};
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    if (!vehicle_id || !/^\d+$/.test(String(vehicle_id))) {
      return res.status(400).json({ message: "vehicle_id is required" });
    }
    const r = await driverRepo().update(
      { id, deleted_at: IsNull() },
      { vehicle_id: String(vehicle_id) }
    );
    if (r.affected === 0) return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver assigned to vehicle" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign driver", error: error?.message });
  }
};

// POST /api/drivers/:id/unassign-vehicle
export const unassignDriverVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await driverRepo().update({ id, deleted_at: IsNull() }, { vehicle_id: null });
    if (r.affected === 0) return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver unassigned from vehicle" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to unassign driver", error: error?.message });
  }
};

// DELETE /api/drivers/:id (soft)
export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await driverRepo().update({ id }, { deleted_at: new Date() });
    if (r.affected === 0) return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete driver", error: error?.message });
  }
};
