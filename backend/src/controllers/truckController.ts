import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Trucks } from "../entity/truck";

const truckRepo = AppDataSource.getRepository(Trucks);

export const createTruck = async (req: Request, res: Response) => {
  try {
    const { truckNo, regoNo, modelNo, statusID, userID } = req.body;

      // 1️⃣ Prevent duplicate
    const existing = await truckRepo.findOne({
      where: [
        {  title: truckNo },
        { slug: regoNo },
        { code: modelNo },

      ],
    });

    if (existing) {
      return res.status(400).json({
        message: "Truck number already exists",
      });
    }

    if (!truckNo || !regoNo || !modelNo || !statusID || !userID) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // ✅ get last truck safely (TypeORM v0.3+)
    const lastTruckArr = await truckRepo.find({
      order: { ID: "DESC" },
      take: 1,
    });

    const lastTruck = lastTruckArr.length ? lastTruckArr[0] : null;
    const nextSrNo = lastTruck ? lastTruck.srNO + 1 : 1;

    const truck = truckRepo.create({
      title: truckNo,
      slug: regoNo,
      code: modelNo,
      statusID: String(statusID),
      userID: String(userID),
      srNO: nextSrNo,
      logID: new Date().toISOString(),
    });

    const result = await truckRepo.save(truck);

    return res.status(201).json({
      message: "Truck created successfully",
      data: result,
    });

  } catch (error: any) {
    console.error("CREATE TRUCK ERROR:", error);

    return res.status(500).json({
      message: "Error creating truck",
      error: error?.message || "Unknown error",
    });
  }
};





// GET ALL
export const getAllTrucks = async (_req: Request, res: Response) => {
  try {
    const trucks = await truckRepo.find();

    const formatted = trucks.map(truck => ({
      ID: truck.ID,
      srNO: truck.srNO,
      truckNo: truck.title,
      regoNo: truck.slug,
      modelNo: truck.code,
      statusID: truck.statusID,
      userID: truck.userID,
      logID: truck.logID,
    }));

    res.json(formatted);

  } catch (error: any) {
    console.error("GET ALL TRUCKS ERROR:", error);

    res.status(500).json({
      message: "Error fetching trucks",
      error: error?.message || "Unknown error",
    });
  }
};

// GET BY ID
export const getTruckById = async (req: Request, res: Response) => {
  try {
    const truck = await truckRepo.findOne({
      where: { ID: Number(req.params.id) }
    });

    if (!truck) {
      return res.status(404).json({ message: "Truck not found" });
    }

    res.json(truck);
  } catch (error) {
    res.status(500).json({ message: "Error fetching truck", error });
  }
};

// UPDATE
export const updateTruck = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { truckNo, regoNo, modelNo, statusID } = req.body;

    const truck = await truckRepo.findOne({ where: { ID: id } });

    if (!truck) {
      return res.status(404).json({
        success: false,
        message: "Truck not found",
      });
    }

    // 🔍 Check if truckNo already exists in another record
    const existingTruck = await truckRepo
      .createQueryBuilder("truck")
      .where("truck.title = :truckNo", { truckNo })
      .andWhere("truck.ID != :id", { id })
      .getOne();

    if (existingTruck) {
      return res.status(400).json({
        success: false,
        message: "Truck number already exists",
      });
    }

    // 🔥 MAP frontend fields to DB columns
    truck.title = truckNo;
    truck.slug = regoNo;
    truck.code = modelNo;
    truck.statusID = statusID;

    const result = await truckRepo.save(truck);

    console.log(result);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Error updating truck",
      error,
    });
  }
};


// DELETE
export const deleteTruck = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const result = await truckRepo.delete(id);

    if (result.affected === 0) {
      return res.status(404).json({ message: "Truck not found" });
    }

    res.json({ message: "Truck deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting truck", error });
  }
};
