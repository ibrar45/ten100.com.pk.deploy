import express from "express";
import { register, login,getMe } from "./auth.controller.js";
import {
  registerRules,
  loginRules,
  handleValidation,
} from "./auth.validation.js";


import {protect} from "../../middleware/auth.middleware.js"
const router = express.Router();

router.post("/register", ...registerRules, handleValidation, register);
router.post("/login", ...loginRules, handleValidation, login);
router.get("/me", protect, getMe);


export default router;
