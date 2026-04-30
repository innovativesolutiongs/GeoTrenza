import express, { Request, Response, NextFunction } from "express";
import userRoutes from "./routes/userRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import changepasswordRoutes from "./routes/changepasswordRoutes";
import accountcreateRouter from "./routes/accountcreateRouter";
import truckRouter from "./routes/truckRouter";
import devicesRouter from "./routes/deviceRoutes";
import allocationRouter from "./routes/allocationRouter";







import { AppDataSource } from "./ormconfig";
import cors from "cors";
import session from "express-session";
const app = express();
const PORT = process.env.PORT || 4000;

// --------------------
// Middleware
// --------------------

// CORS configuration to allow credentials
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true, // allow cookies or Authorization headers
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

    // Register API routes
    app.use("/api", userRoutes);
    app.use("/api", employeeRoutes);
    app.use("/api", changepasswordRoutes);
    app.use("/api/customer", accountcreateRouter);
    app.use("/api/trucks", truckRouter);
    app.use("/api/devices", devicesRouter);
    app.use("/api/allocation", allocationRouter);




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
