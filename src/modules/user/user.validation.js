import { body } from "express-validator";

/** Optional onboarding endpoint to upgrade `user` -> `owner`. */
export const becomeHostelOwnerRules = [
  body("firstName").trim().notEmpty().withMessage("firstName is required").isLength({ min: 1, max: 80 }),
  body("lastName").trim().notEmpty().withMessage("lastName is required").isLength({ min: 1, max: 80 }),
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("phoneNumber is required")
    .matches(/^\+?\d{10,15}$/)
    .withMessage("phoneNumber must be 10–15 digits, optional leading +"),
  body("gender")
    .trim()
    .notEmpty()
    .withMessage("gender is required")
    .isIn(["male", "female", "non_binary", "other", "prefer_not_to_say"])
    .withMessage("invalid gender"),
  body("dateOfBirth")
    .notEmpty()
    .withMessage("dateOfBirth is required")
    .isISO8601()
    .withMessage("dateOfBirth must be ISO 8601 (e.g. 1990-01-15)"),
  body("address.street").trim().notEmpty().withMessage("address.street is required"),
  body("address.city").trim().notEmpty().withMessage("address.city is required"),
  body("address.state").trim().notEmpty().withMessage("address.state is required"),
  body("address.zipCode").trim().notEmpty().withMessage("address.zipCode is required"),
];

export const updateProfileRules = [
  body("firstName").optional().trim().isLength({ min: 2 }),
  body("lastName").optional().trim().isLength({ min: 2 }),
  body("phoneNumber").optional().matches(/\+?\d{10,15}/).withMessage("Invalid phone format"),
  body("gender")
    .optional()
    .trim()
    .isIn(["male", "female", "non_binary", "other", "prefer_not_to_say"])
    .withMessage("invalid gender"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("dateOfBirth must be a valid ISO 8601 date (e.g. 1990-01-15)"),
  body("address.city").optional().notEmpty(),
  body("address.zipCode").optional().isPostalCode("any").withMessage("Invalid Zip Code"),
];