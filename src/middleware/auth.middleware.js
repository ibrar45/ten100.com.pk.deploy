import jwt from "jsonwebtoken";
import User from "../modules/auth/user.model.js";
import { sendError } from "../utils/http.js";

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return sendError(res, 401, "AUTH_MISSING_TOKEN", "Unauthorized: No token provided");
  }

  try {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      return sendError(
        res,
        500,
        "SERVER_MISCONFIG",
        "Server misconfiguration: JWT_SECRET is not set"
      );
    }
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    const liveUser = await User.findById(req.userId).select("role isDeleted");
    if (!liveUser || liveUser.isDeleted) {
      return sendError(res, 401, "AUTH_ACCOUNT_DELETED", "Unauthorized: account deleted");
    }
    req.userRole = liveUser.role || req.userRole;

    // Tokens minted before `role` was added to the JWT have no `role` claim — load from DB
    if (!req.userRole) return sendError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized");

    next();
  } catch (error) {
    return sendError(res, 401, "AUTH_INVALID_TOKEN", "Unauthorized: Invalid token");
  }
};

/** Sets `req.userId` / `req.userRole` when a valid cookie JWT exists; otherwise continues without auth. */
export const optionalProtect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) return next();
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    const user = await User.findById(req.userId).select("role isDeleted");
    if (!user || user.isDeleted) return next();
    req.userRole = user.role || req.userRole;
  } catch {
    // ignore invalid/expired token for public routes
  }
  next();
};

/** Run after `protect`. Rejects if JWT has no role (re-login after deploy) or role is not allowed. */
export const allowRoles = (...allowed) => (req, res, next) => {
  const role = req.userRole;
  if (!role || !allowed.includes(role)) {
    return sendError(
      res,
      403,
      "AUTH_FORBIDDEN_ROLE",
      "Forbidden: this action is not allowed for your account type"
    );
  }
  next();
};
