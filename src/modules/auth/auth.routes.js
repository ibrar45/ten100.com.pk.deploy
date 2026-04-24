import express from "express";
import { register, login, logout, getMe } from "./auth.controller.js";
import {
  registerRules,
  loginRules,
  handleValidation,
} from "./auth.validation.js";


import {protect} from "../../middleware/auth.middleware.js"
const router = express.Router();

router.post("/register", ...registerRules, handleValidation, register);
router.post("/login", ...loginRules, handleValidation, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);


export default router;
