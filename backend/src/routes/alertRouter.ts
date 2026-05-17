import { Router } from "express";
import {
  listAlerts, getAlertById, acknowledgeAlert, resolveAlert,
  snoozeAlert, muteAlert, deleteAlert,
} from "../controllers/alertController";

const router = Router();

router.get("/", listAlerts);
router.get("/:id", getAlertById);
router.post("/:id/acknowledge", acknowledgeAlert);
router.post("/:id/resolve", resolveAlert);
router.post("/:id/snooze", snoozeAlert);
router.post("/:id/mute", muteAlert);
router.delete("/:id", deleteAlert);

export default router;
