import { Router } from "express";
import {
  listSubscriptionsForUser, createSubscription,
  updateSubscription, deleteSubscription,
} from "../controllers/alertSubscriptionController";

// Two mount points:
//   /api/users/:userId/alert-subscriptions (list, create)
//   /api/alert-subscriptions/:id           (update, delete)
// Wired separately in index.ts because Express doesn't allow two distinct
// base paths on a single Router cleanly.

export const userScopedRouter = Router({ mergeParams: true });
userScopedRouter.get("/", listSubscriptionsForUser);
userScopedRouter.post("/", createSubscription);

export const idScopedRouter = Router();
idScopedRouter.put("/:id", updateSubscription);
idScopedRouter.delete("/:id", deleteSubscription);
