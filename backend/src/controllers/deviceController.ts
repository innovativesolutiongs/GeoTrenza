import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Devices } from "../entity/device";

const deviceRepo = AppDataSource.getRepository(Devices);

export const createDevice = async (req: Request, res: Response) => {
  try {
    const { deviceNo, deviceName, statusID, userID } = req.body;

    // 🔍 Check if device number already exists
    const deviceNoExists = await deviceRepo.findOne({
      where: { code: deviceNo },
    });

    if (deviceNoExists) {
      return res.status(400).json({
        success: false,
        message: "Device number already exists",
      });
    }

    // 🔍 Check if device name already exists
    const deviceNameExists = await deviceRepo.findOne({
      where: { title: deviceName },
    });

    if (deviceNameExists) {
      return res.status(400).json({
        success: false,
        message: "Device name already exists",
      });
    }

    // 2️⃣ Get next srNO safely
    const result = await deviceRepo
      .createQueryBuilder("device")
      .select("MAX(device.srNO)", "max")
      .getRawOne();

    const nextSrNo = result?.max ? Number(result.max) + 1 : 1;

    // 3️⃣ Store timestamp
    const logID = new Date();

    const device = deviceRepo.create({
      srNO: nextSrNo,
      title: deviceName,
      code: deviceNo,
      statusID,
      userID,
      logID,
    });

    const savedDevice = await deviceRepo.save(device);

    // 4️⃣ Format timestamp for response
    const d = new Date(savedDevice.logID);
    const formattedLogID = `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}-${String(
      d.getHours()
    ).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}-${String(
      d.getSeconds()
    ).padStart(2, "0")}`;

    res.status(201).json({
      ...savedDevice,
      logID: formattedLogID,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create device", error });
  }
};




// GET ALL DEVICES WITH ALIASES
export const getAllDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await deviceRepo
      .createQueryBuilder("device")
      .select([
        "device.ID",
        "device.srNO",
        "device.statusID",
        "device.userID",
        "device.logID",
      ])
      .addSelect("device.title", "deviceName") // alias title -> deviceNo
      .addSelect("device.code", "deviceNo") // alias code -> deviceName
      .addSelect("device.statusID", "statusID") // alias code -> deviceName

      .getRawMany();

    res.json(devices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch devices", error });
  }
};


// GET DEVICE BY ID
export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = await deviceRepo.findOneBy({ ID: parseInt(id) });

    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json(device);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch device", error });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceNo, deviceName, statusID } = req.body;

    console.log("REQ BODY →", req.body);

    const device = await deviceRepo.findOneBy({ ID: parseInt(id) });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // 🔍 Check duplicate device number (excluding current record)
    const deviceNoExists = await deviceRepo
      .createQueryBuilder("device")
      .where("device.code = :deviceNo", { deviceNo })
      .andWhere("device.ID != :id", { id })
      .getOne();

    if (deviceNoExists) {
      return res.status(400).json({
        success: false,
        message: "Device number already exists",
      });
    }

    // 🔍 Check duplicate device name (excluding current record)
    const deviceNameExists = await deviceRepo
      .createQueryBuilder("device")
      .where("device.title = :deviceName", { deviceName })
      .andWhere("device.ID != :id", { id })
      .getOne();

    if (deviceNameExists) {
      return res.status(400).json({
        success: false,
        message: "Device name already exists",
      });
    }

    // ✅ Update device
    deviceRepo.merge(device, {
      code: deviceNo,
      title: deviceName,
      statusID: statusID,
    });

    const updatedDevice = await deviceRepo.save(device);

    console.log("UPDATED DEVICE →", updatedDevice);

    res.json(updatedDevice);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update device",
      error,
    });
  }
};


// DELETE DEVICE
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // console.log(req.params)
    const device = await deviceRepo.findOneBy({ ID: parseInt(id) });
    if (!device) return res.status(404).json({ message: "Device not found" });

    await deviceRepo.remove(device);
    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete device", error });
  }
};
