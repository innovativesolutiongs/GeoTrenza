import { Router } from "express";
import { getAllTrucks, getTruckById, getTruckEvents } from "../controllers/truckController";

const router = Router();

router.get("/", getAllTrucks);
router.get("/:id/events", getTruckEvents); // must come before /:id so /:id doesn't match
router.get("/:id", getTruckById);

export default router;
