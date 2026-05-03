import { logger } from "../config/logger.js";
import { sendError } from "../utils/http.js";
export function notFound(req, res) {
  sendError(res, 404, "NOT_FOUND", "Route not found");
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  const code = err.code || (status === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED");

  logger.error("request_failed", {
    path: req.path,
    method: req.method,
    status,
    name: err.name,
    message: err.message,
  });

  sendError(
    res,
    status,
    code,
    isProd && status === 500 ? "Internal server error" : err.message,
    isProd ? err.details : { ...(err.details || {}), stack: err.stack }
  );
}