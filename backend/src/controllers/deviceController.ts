import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Devices } from "../entity/device";

const deviceRepo = () => AppDataSource.getRepository(Devices);

export const getAllDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await deviceRepo().find({ order: { id: "ASC" } });
    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch devices", error: error?.message });
  }
};

export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: "id must be a positive integer" });
    }
    const device = await deviceRepo().findOneBy({ id });
    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json(device);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch device", error: error?.message });
  }
};
