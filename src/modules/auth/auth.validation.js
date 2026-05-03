import { body, validationResult } from "express-validator";
import { sendError } from "../../utils/http.js";

export const registerRules = [
  body("username").trim().isLength({ min: 2 }).withMessage("username min 2 chars"),
  body("email").trim().isEmail().withMessage("valid email required"),
  body("password").isLength({ min: 8 }).withMessage("password min 8 chars"),
];

export const loginRules = [
  body("identifier").trim().notEmpty().withMessage("identifier required"),
  body("password").notEmpty().withMessage("password required"),
];

export const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("currentPassword required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("newPassword must be at least 8 characters"),
];

export function handleValidation(req, res, next) {
  const result = validationResult(req);
 
  if (!result.isEmpty()) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "Validation failed",
      result.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}