import { Router } from "express";
import {
  createTruck,
  getAllTrucks,
  getTruckById,
  updateTruck,
  deleteTruck
} from "../controllers/truckController";

const router = Router();

router.post("/", createTruck);
router.get("/", getAllTrucks);
router.get("/:id", getTruckById);
router.put("/:id", updateTruck);
router.delete("/:id", deleteTruck);

export default router;
