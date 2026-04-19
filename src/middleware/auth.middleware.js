import jwt from "jsonwebtoken";
import User from "../modules/auth/user.model.js";

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: JWT_SECRET is not set",
      });
    }
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    // Tokens minted before `role` was added to the JWT have no `role` claim — load from DB
    if (!req.userRole) {
      const user = await User.findById(req.userId).select("role");
      if (user?.role) req.userRole = user.role;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

/** Run after `protect`. Rejects if JWT has no role (re-login after deploy) or role is not allowed. */
export const allowRoles = (...allowed) => (req, res, next) => {
  const role = req.userRole;
  if (!role || !allowed.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: this action is not allowed for your account type",
    });
  }
  next();
};
