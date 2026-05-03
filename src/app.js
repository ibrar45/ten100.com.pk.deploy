import express from "express";
import path from "node:path";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import roleRoute from "./modules/role/role.routes.js";
import propertyRoute from "./modules/properties/property.routes.js";
import profileRoute from "./modules/user/user.routes.js";
import requestRouter from "./modules/request/request.routes.js";
import hostelRouter from "./modules/hostel/hostel.routes.js";
import bedRouter from "./modules/bed/bed.routes.js";
import {
  securityHeaders,
  corsMiddleware,
  apiLimiter,
  authLimiter,
} from "./middleware/security.middleware.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const isProd = process.env.NODE_ENV === "production";
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

app.use(securityHeaders());
app.use(corsMiddleware(corsOrigins, isProd));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/role", roleRoute);
app.use("/api/properties", propertyRoute);
app.use("/api/profile", profileRoute);
app.use("/api/requests", requestRouter);
app.use("/api/hostels", hostelRouter);
app.use("/api/beds", bedRouter);

app.use(notFound);
app.use(errorHandler);

export default app;