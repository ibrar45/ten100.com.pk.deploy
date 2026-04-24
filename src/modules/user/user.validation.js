import { body } from "express-validator";

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