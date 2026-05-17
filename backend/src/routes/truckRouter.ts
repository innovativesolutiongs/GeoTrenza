import { Router } from "express";
import { getAllTrucks, getTruckById } from "../controllers/truckController";

const router = Router();

router.get("/", getAllTrucks);
router.get("/:id", getTruckById);

export default router;
