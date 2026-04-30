import { Router } from "express";
import { EmployeeController } from "../controllers/employeeController";

const router = Router();
const controller = new EmployeeController();


// 👉 GET /api/complience
router.get("/employee/:companyID", (req, res) => controller.getEmployees(req, res));

export default router;
