import { Router } from "express";
import {
  createCustomer, listCustomers, getCustomerById, updateCustomer, deleteCustomer,
  createUser, listUsers, updateUser, deleteUser,
} from "../controllers/customerController";
import { createVehicleForCustomer, getVehiclesForCustomer } from "../controllers/vehicleController";
import { createDriverForCustomer, listDriversForCustomer } from "../controllers/driverController";

const router = Router();

router.get("/customers", listCustomers);
router.post("/customers", createCustomer);
router.get("/customers/:id", getCustomerById);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

router.get("/customers/:customerId/vehicles", getVehiclesForCustomer);
router.post("/customers/:customerId/vehicles", createVehicleForCustomer);

router.get("/customers/:customerId/drivers", listDriversForCustomer);
router.post("/customers/:customerId/drivers", createDriverForCustomer);

router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;
