import { Router } from "express";
import { changepasswordController } from "../controllers/changepasswordController";

const router = Router();
const controller = new changepasswordController();

router.post("/changepassword", (req, res) =>
  controller.changePassword(req, res)
);

export default router;
