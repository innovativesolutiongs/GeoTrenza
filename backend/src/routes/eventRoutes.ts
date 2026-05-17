import { Router } from "express";
import { getEventsForDevice } from "../controllers/eventController";

const router = Router();

router.get("/", getEventsForDevice);

export default router;
