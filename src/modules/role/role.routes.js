
// routes/role.routes.js
import { Router } from 'express';
import { getRoles, seedRoles } from './role.controller.js';

const roleRoute = Router();

// fix3: block unauthenticated destructive seed unless caller sends env secret
const requireRoleSeedSecret = (req, res, next) => {
  const expected = process.env.ROLE_SEED_KEY?.trim();
  if (!expected) {
    return res
      .status(403)
      .json({ success: false, message: "Role seeding is disabled (ROLE_SEED_KEY not set)" });
  }
  const provided = String(req.headers["x-role-seed-key"] || "").trim();
  if (provided !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};

// GET /api/v1/roles
roleRoute.get('/', getRoles);

// POST /api/v1/roles/seed (Admin only in production!)
roleRoute.post('/seed', requireRoleSeedSecret, seedRoles);

export default roleRoute;