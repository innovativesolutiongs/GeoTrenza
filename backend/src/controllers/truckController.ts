import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Trucks } from "../entity/truck";

const truckRepo = () => AppDataSource.getRepository(Trucks);

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
