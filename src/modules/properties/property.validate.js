import { body } from "express-validator";

export const propertyRules = [
  body("title")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters when provided"),

  body("category")
    .isIn(["Home", "Apartment"])
    .withMessage("Category must be Home or Apartment"),

  body("sizeInMarla")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("Size must be a number")
    .custom((val) => Number(val) > 0)
    .withMessage("Size must be greater than 0"),

  body("structureType")
    .isIn(["Full", "Partial"])
    .withMessage("Must be either Full or Partial"),

  body("portionDetails")
    .if(body("structureType").equals("Partial"))
    .trim()
    .notEmpty()
    .withMessage("Specify which portion (e.g., 1st floor, basement)"),

  body("floor")
    .if(body("category").equals("Apartment"))
    .notEmpty()
    .withMessage("Floor is required for apartments"),

  body("floor")
    .if(
      (value, { req }) =>
        req.body.category === "Home" && req.body.structureType === "Partial"
    )
    .notEmpty()
    .withMessage("Floor is required for partial home listings"),

  body("totalRooms").isInt({ min: 1 }).withMessage("At least 1 room is required"),

  body("bathrooms").isInt({ min: 1 }).withMessage("At least 1 bathroom is required"),

  body("attachedBaths")
    .isInt({ min: 0 })
    .custom((value, { req }) => {
      if (parseInt(value, 10) > parseInt(req.body.bathrooms, 10)) {
        throw new Error("Attached baths cannot exceed total bathrooms");
      }
      return true;
    }),

  body("price").isNumeric().withMessage("Price must be a number"),

  body("location.city").trim().notEmpty().withMessage("City is required"),
  body("location.area").trim().notEmpty().withMessage("Area is required"),

  body("location.street")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 3 })
    .withMessage("Street must be at least 3 characters when provided"),

  body("location.fullAddress")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 5 })
    .withMessage("Full address must be at least 5 characters when provided"),
];