import { Router } from "express";
import {
  listGateways, createGateway, getGatewayById, updateGateway,
  assignGatewayCustomer, unassignGatewayCustomer,
  assignGatewayVehicle, unassignGatewayVehicle,
  deleteGateway,
} from "../controllers/gatewayController";

const router = Router();

router.get("/", listGateways);
router.post("/", createGateway);
router.get("/:id", getGatewayById);
router.put("/:id", updateGateway);
router.post("/:id/assign-customer", assignGatewayCustomer);
router.post("/:id/unassign-customer", unassignGatewayCustomer);
router.post("/:id/assign-vehicle", assignGatewayVehicle);
router.post("/:id/unassign-vehicle", unassignGatewayVehicle);
router.delete("/:id", deleteGateway);

export default router;
