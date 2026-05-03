import express from "express";
import { becomeHostelOwner, getProfile, updateProfile } from "./user.controller.js";
import { protect, allowRoles } from "../../middleware/auth.middleware.js";

import { becomeHostelOwnerRules, updateProfileRules } from "./user.validation.js";
import { handleValidation } from "../auth/auth.validation.js";

const profileRoute = express.Router();

profileRoute.use(protect);

profileRoute.get("/me", getProfile);
profileRoute.patch("/me", updateProfileRules, handleValidation, updateProfile);
profileRoute.post(
  "/me/become-hostel-owner",
  allowRoles("user"),
  becomeHostelOwnerRules,
  handleValidation,
  becomeHostelOwner
);

export default profileRoute;