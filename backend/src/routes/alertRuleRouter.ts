import { Router } from "express";
import {
  createAlertRule, listAlertRules, getAlertRuleById,
  updateAlertRule, deleteAlertRule, testFireAlertRule,
} from "../controllers/alertRuleController";

const router = Router();

router.post("/", createAlertRule);
router.get("/", listAlertRules);
router.get("/:id", getAlertRuleById);
router.put("/:id", updateAlertRule);
router.delete("/:id", deleteAlertRule);
router.post("/:id/test", testFireAlertRule);

export default router;
