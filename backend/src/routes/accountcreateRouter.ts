// src/routes/accountsRouter.ts
import { Router } from "express";
import { AccountsController } from "../controllers/accountController";

const router = Router();
const accountsController = new AccountsController();

// GET all accounts
router.get("/", accountsController.getAll);
router.post("/", accountsController.create);
router.put("/update/:id", accountsController.update);
router.delete("/delete/:id", accountsController.delete);
router.post("/update-credentials", accountsController.updateUserCredentials);







export default router;
