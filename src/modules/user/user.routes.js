import express from "express";
import { getProfile, updateProfile } from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

import { updateProfileRules } from "./user.validation.js";
import { handleValidation } from "../auth/auth.validation.js"; // Reuse your existing handler

const profileRoute = express.Router();

// All user routes are protected
profileRoute.use(protect);

profileRoute.get("/me", getProfile);
profileRoute.patch("/me", updateProfileRules, handleValidation, updateProfile);

export default profileRoute;