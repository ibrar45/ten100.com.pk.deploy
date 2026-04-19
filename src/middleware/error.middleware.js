import { logger } from "../config/logger.js";
export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Not found" });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  logger.error("request_failed", {
    path: req.path,
    method: req.method,
    status,
    name: err.name,
    message: err.message,
  });

  res.status(status).json({
    success: false,
    message: isProd && status === 500 ? "Internal server error" : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}