import { Router } from "express";
import { getLatestPositions, getPositionsForDevice } from "../controllers/positionController";

const router = Router();

router.get("/latest", getLatestPositions);
router.get("/", getPositionsForDevice);

export default router;
