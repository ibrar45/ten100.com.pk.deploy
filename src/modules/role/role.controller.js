// controllers/role.controller.js
import { Role } from './role.model.js';
import { sendError, sendSuccess } from "../../utils/http.js";

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}, 'name'); // Only return the name field
    return sendSuccess(res, roles.map((r) => r.name));
  } catch (error) {
    return sendError(res, 500, "ROLE_FETCH_FAILED", "Failed to fetch roles");
  }
};

// Seed function to run during initial setup
export const seedRoles = async (req, res) => {
  const roles = [
    { name: "user", description: "Default user account" },
    { name: "owner", description: "Hostel owner account" },
    { name: "hostel_owner", description: "Legacy alias for owner account" },
    { name: "tenant", description: "Renter of the property" },
    { name: "landlord", description: "Individual property owner" },
  ];

  try {
    await Role.deleteMany(); // Clear existing
    await Role.insertMany(roles);
    return sendSuccess(res, undefined, { status: 201, message: "Roles seeded successfully" });
  } catch (error) {
    return sendError(res, 500, "ROLE_SEED_FAILED", "Failed to seed roles");
  }
};