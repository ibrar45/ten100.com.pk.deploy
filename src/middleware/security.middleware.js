import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

export function securityHeaders() {
  return helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}

/** Behind nginx/Railway/Render: set TRUST_PROXY=1 so rate-limit uses real client IP */
export function corsMiddleware(corsOrigins, isProd) {
  return cors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : !isProd
          ? true
          : false,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-role-seed-key"],
  });
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
});