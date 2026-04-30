import { Router } from "express";
import { AccountsController } from "../controllers/allocationController";

const router = Router();
const controller = new AccountsController();

router.get("/", controller.getAll);
router.post("/", controller.create);
router.delete("/:id", controller.delete);
router.get("/customer/:customerId", controller.getByCustomer);


export default router;
