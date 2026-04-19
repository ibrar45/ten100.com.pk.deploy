import { body, validationResult } from "express-validator";

export const registerRules = [
  body("username").trim().isLength({ min: 2 }).withMessage("username min 2 chars"),
  body("email").trim().isEmail().withMessage("valid email required"),
  body("password").isLength({ min: 8 }).withMessage("password min 8 chars"),
  body("role")
    .isIn(["tenant", "landlord", "hostel_owner"])
    .withMessage("invalid role"),
];

export const loginRules = [
  body("identifier").trim().notEmpty().withMessage("identifier required"),
  body("password").notEmpty().withMessage("password required"),
];

export function handleValidation(req, res, next) {
  console.warn("validation")
  const result = validationResult(req);
 
  if (!result.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.array().map((e) => e.msg),
    });
  }
  next();
}