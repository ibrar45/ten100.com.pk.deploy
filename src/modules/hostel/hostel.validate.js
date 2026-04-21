import { body, param } from "express-validator";

export const createHostelRules = [
  body("name").trim().notEmpty().withMessage("Hostel name is required"),
  body("code")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 2, max: 12 })
    .withMessage("Code must be 2 to 12 characters"),
  body("genderPolicy")
    .optional()
    .isIn(["boys", "girls", "co_live"])
    .withMessage("Gender policy must be boys, girls or co_live"),
  body("totalFloors")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("Total floors must be 0 or greater"),
  body("contact.phone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone must be 7 to 20 characters"),
  body("contact.alternatePhone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Alternate phone must be 7 to 20 characters"),
  body("contact.email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("Contact email must be valid"),
  body("address.city").trim().notEmpty().withMessage("City is required"),
  body("address.area").trim().notEmpty().withMessage("Area is required"),
  body("address.street").optional({ values: "falsy" }).trim(),
  body("address.fullAddress").optional({ values: "falsy" }).trim(),
  body("address.pincode").optional({ values: "falsy" }).trim(),
  body("amenities").optional().isArray().withMessage("Amenities must be an array"),
  body("rules").optional().isArray().withMessage("Rules must be an array"),
];

export const addRoomRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  body("roomNo").trim().notEmpty().withMessage("Room number is required"),
  body("floorNumber")
    .isInt({ min: 0 })
    .withMessage("Floor number must be 0 or greater"),
  body("bedCount").isInt({ min: 1 }).withMessage("Bed count must be at least 1"),
  body("occupiedBeds")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("Occupied beds must be 0 or greater"),
  body("hasAC").optional().isBoolean().withMessage("hasAC must be true/false"),
  body("hasAttachedBath")
    .optional()
    .isBoolean()
    .withMessage("hasAttachedBath must be true/false"),
  body("rentPerBed")
    .isNumeric()
    .withMessage("Rent per bed must be a number")
    .custom((value) => Number(value) >= 0)
    .withMessage("Rent per bed cannot be negative"),
  body("securityDeposit")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("Security deposit must be a number")
    .custom((value) => Number(value) >= 0)
    .withMessage("Security deposit cannot be negative"),
  body("roomType")
    .optional()
    .isIn(["single", "double", "triple", "dormitory", "custom"])
    .withMessage("Invalid room type"),
  body("furnishing")
    .optional()
    .isIn(["furnished", "semi_furnished", "unfurnished"])
    .withMessage("Invalid furnishing type"),
  body("hasBalcony")
    .optional()
    .isBoolean()
    .withMessage("hasBalcony must be true/false"),
  body("hasWifi").optional().isBoolean().withMessage("hasWifi must be true/false"),
  body("status")
    .optional()
    .isIn(["available", "partially_occupied", "full", "maintenance"])
    .withMessage("Invalid room status"),
  body("notes").optional({ values: "falsy" }).trim(),
];
