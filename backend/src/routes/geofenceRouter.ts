import { Router } from "express";
import {
  createGeofence, listGeofences, getGeofenceById,
  updateGeofence, deleteGeofence,
} from "../controllers/geofenceController";

const router = Router();

router.post("/", createGeofence);
router.get("/", listGeofences);
router.get("/:id", getGeofenceById);
router.put("/:id", updateGeofence);
router.delete("/:id", deleteGeofence);

export default router;
