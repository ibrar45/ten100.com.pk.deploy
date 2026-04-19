import { body } from "express-validator";

export const updateProfileRules = [
  body("firstName").optional().trim().isLength({ min: 2 }),
  body("lastName").optional().trim().isLength({ min: 2 }),
  body("phoneNumber").optional().matches(/\+?\d{10,15}/).withMessage("Invalid phone format"),
  body("address.city").optional().notEmpty(),
  body("address.zipCode").optional().isPostalCode("any").withMessage("Invalid Zip Code"),
];