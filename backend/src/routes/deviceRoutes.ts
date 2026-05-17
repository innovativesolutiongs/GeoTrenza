import { Router } from "express";
import { getAllDevices, getDeviceById } from "../controllers/deviceController";

const router = Router();

router.get("/", getAllDevices);
router.get("/:id", getDeviceById);

export default router;
