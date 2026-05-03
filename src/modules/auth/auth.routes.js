import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
  softDeleteAccount,
} from "./auth.controller.js";
import {
  registerRules,
  loginRules,
  changePasswordRules,
  handleValidation,
} from "./auth.validation.js";


import {protect} from "../../middleware/auth.middleware.js"
const router = express.Router();

router.post("/register", ...registerRules, handleValidation, register);
router.post("/login", ...loginRules, handleValidation, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, ...changePasswordRules, handleValidation, changePassword);
router.delete("/me", protect, softDeleteAccount);


export default router;
