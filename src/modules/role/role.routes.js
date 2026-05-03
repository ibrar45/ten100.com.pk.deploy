
// routes/role.routes.js
import { Router } from 'express';
import { getRoles, seedRoles } from './role.controller.js';
import { sendError } from "../../utils/http.js";

const roleRoute = Router();

// fix3: block unauthenticated destructive seed unless caller sends env secret
const requireRoleSeedSecret = (req, res, next) => {
  const expected = process.env.ROLE_SEED_KEY?.trim();
  if (!expected) {
    return sendError(
      res,
      403,
      "ROLE_SEED_DISABLED",
      "Role seeding is disabled (ROLE_SEED_KEY not set)"
    );
  }
  const provided = String(req.headers["x-role-seed-key"] || "").trim();
  if (provided !== expected) {
    return sendError(res, 403, "FORBIDDEN", "Forbidden");
  }
  next();
};

// GET /api/v1/roles
roleRoute.get('/', getRoles);

// POST /api/v1/roles/seed (Admin only in production!)
roleRoute.post('/seed', requireRoleSeedSecret, seedRoles);

export default roleRoute;