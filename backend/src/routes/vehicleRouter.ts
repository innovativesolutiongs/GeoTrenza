import { Router } from "express";
import {
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleEvents,
} from "../controllers/vehicleController";

const router = Router();

// /api/vehicles namespace — collection + by-id ops.
// Per-customer create/list lives under /api/customers/:customerId/vehicles in customerRouter.
router.get("/", getAllVehicles);
router.get("/:id/events", getVehicleEvents); // before /:id
router.get("/:id", getVehicleById);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
