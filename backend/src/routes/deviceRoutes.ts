import { Router } from "express";
import {
  createDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
} from "../controllers/deviceController";

const router = Router();

router.post("/", createDevice);
router.get("/", getAllDevices);
router.get("/:id", getDeviceById);
router.put("/:id", updateDevice);
router.delete("/:id", deleteDevice);

export default router;
