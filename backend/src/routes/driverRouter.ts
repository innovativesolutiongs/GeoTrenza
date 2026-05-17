import { Router } from "express";
import {
  getDriverById, updateDriver, assignDriverVehicle, unassignDriverVehicle, deleteDriver,
} from "../controllers/driverController";

const router = Router();

router.get("/:id", getDriverById);
router.put("/:id", updateDriver);
router.post("/:id/assign-vehicle", assignDriverVehicle);
router.post("/:id/unassign-vehicle", unassignDriverVehicle);
router.delete("/:id", deleteDriver);

export default router;
