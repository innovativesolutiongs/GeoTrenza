import express, { Request, Response, NextFunction } from "express";
import userRoutes from "./routes/userRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import changepasswordRoutes from "./routes/changepasswordRoutes";
import accountcreateRouter from "./routes/accountcreateRouter";
import vehicleRouter from "./routes/vehicleRouter";
import positionRouter from "./routes/positionRoutes";
import eventRouter from "./routes/eventRoutes";
import customerRouter from "./routes/customerRouter";
import gatewayRouter from "./routes/gatewayRouter";
import driverRouter from "./routes/driverRouter";







import { AppDataSource } from "./ormconfig";
import cors from "cors";
import session from "express-session";
const app = express();
const PORT = process.env.PORT || 4000;

// Stage 1 → Stage 2 gap: when set to "true", returns 503 on routes whose
// underlying tables are being reshaped (devices/trucks/allocation). Turned on
// just before Stage 1 cutover, turned off as part of Stage 2 deploy. See
// docs/stage-1-deployment.md.
const STAGE_1_GAP_MODE = process.env.STAGE_1_GAP_MODE === "true";

// Stage 1 gap middleware retained for reference, no longer mounted (Stage 2 complete).
const _stage1GapMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!STAGE_1_GAP_MODE) return next();
  res.status(503).json({
    error: "Service temporarily unavailable during schema migration",
    expected_recovery: "Stage 2 deployment",
  });
};
void _stage1GapMiddleware;

// --------------------
// Middleware
// --------------------

// CORS — Stage 3 pre-launch: reflect any Origin so local dev, production
// dashboard, and ad-hoc curl all work. CORS_ORIGIN env var lets us lock it
// down per environment later (Stage 4 will pin to the production domain).
const corsOrigin: any = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : true;
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(
  session({
    name: "WEBSITE",
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false, // important
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);
// Parse JSON bodies
app.use(express.json());

// Optional: request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --------------------
// Default route
// --------------------
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

// --------------------
// Initialize TypeORM DataSource
// --------------------
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");
    if (STAGE_1_GAP_MODE) {
      console.log(
        "STAGE_1_GAP_MODE active: /api/trucks, /api/devices, /api/allocation will return 503"
      );
    }

    // Register API routes
    app.use("/api", userRoutes);
    app.use("/api", employeeRoutes);
    app.use("/api", changepasswordRoutes);
    app.use("/api/customer", accountcreateRouter); // legacy v1 — unchanged
    app.use("/api/vehicles", vehicleRouter);
    app.use("/api/positions", positionRouter);
    app.use("/api/events", eventRouter);
    // Stage 3e admin CRUD
    app.use("/api", customerRouter); // mounts /customers, /users
    app.use("/api/gateways", gatewayRouter);
    app.use("/api/drivers", driverRouter);
    // Backwards-compat aliases: existing frontend bundles still call these.
    app.use("/api/trucks", vehicleRouter);
    app.use("/api/devices", gatewayRouter);




    // --------------------
    // Global error handler
    // --------------------
    app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        console.error(err.stack);
        res.status(err.status || 500).json({
          message: err.message || "Internal Server Error",
        });
      }
    );

    app.use((req, res, next) => {
      console.log("HIT:", req.method, req.url);
      next();
    });


    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
