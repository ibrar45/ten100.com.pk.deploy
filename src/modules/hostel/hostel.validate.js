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
  body("isShortStayAvailable")
    .optional()
    .isBoolean()
    .withMessage("isShortStayAvailable must be true/false"),
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
  body("images")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("images must be an array or a JSON string array");
    }),
  body("amenities")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("amenities must be an array or a JSON string array");
    }),
  body("rules")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("rules must be an array or a JSON string array");
    }),
];

export const addRoomRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  body("roomNo").trim().notEmpty().withMessage("Room number is required"),
  body("floorNumber")
    .isInt({ min: 0 })
    .withMessage("Floor number must be 0 or greater"),
  body("totalSeats").isInt({ min: 1 }).withMessage("totalSeats must be at least 1"),
  body("availableSeats")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("availableSeats must be 0 or greater"),
  body("attachedBath").optional().isBoolean().withMessage("attachedBath must be true/false"),
  body("acAvailable")
    .optional()
    .isBoolean()
    .withMessage("acAvailable must be true/false"),
  body("geyserAvailable")
    .optional()
    .isBoolean()
    .withMessage("geyserAvailable must be true/false"),
  body("sharingType")
    .optional()
    .isInt({ min: 1 })
    .withMessage("sharingType must be a number greater than 0"),
  body("rentPerBed")
    .isNumeric()
    .withMessage("Rent per bed must be a number")
    .custom((value) => Number(value) >= 0)
    .withMessage("Rent per bed cannot be negative"),
  body("rentPerBedPerDay")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("rentPerBedPerDay must be a number")
    .custom((value) => Number(value) > 0)
    .withMessage("rentPerBedPerDay must be greater than 0"),
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
  body("images")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("images must be an array or a JSON string array");
    }),
];

export const updateRoomRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  param("roomId").isMongoId().withMessage("Invalid room id"),
  body("roomNo").optional({ values: "falsy" }).trim().notEmpty().withMessage("Room number is required"),
  body("floorNumber")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("Floor number must be 0 or greater"),
  body("totalSeats").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("totalSeats must be at least 1"),
  body("rentPerBed")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("Rent per bed must be a number")
    .custom((value) => Number(value) >= 0)
    .withMessage("Rent per bed cannot be negative"),
  body("rentPerBedPerDay")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("rentPerBedPerDay must be a number")
    .custom((value) => Number(value) > 0)
    .withMessage("rentPerBedPerDay must be greater than 0"),
  body("securityDeposit")
    .optional({ values: "falsy" })
    .isNumeric()
    .withMessage("Security deposit must be a number")
    .custom((value) => Number(value) >= 0)
    .withMessage("Security deposit cannot be negative"),
  body("images")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("images must be an array or a JSON string array");
    }),
];

export const updateBedRules = [
  param("bedId").isMongoId().withMessage("Invalid bed id"),
  body("status")
    .optional()
    .isIn(["available", "occupied", "blocked"])
    .withMessage("status must be available, occupied, or blocked"),
  body("isListed").optional().isBoolean().withMessage("isListed must be true/false"),
];

export const publishHostelRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
];

export const updateHostelRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  body("name").optional({ values: "falsy" }).trim().notEmpty().withMessage("Hostel name is required"),
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
  body("isShortStayAvailable")
    .optional()
    .isBoolean()
    .withMessage("isShortStayAvailable must be true/false"),
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
  body("address.city").optional({ values: "falsy" }).trim().notEmpty().withMessage("City is required"),
  body("address.area").optional({ values: "falsy" }).trim().notEmpty().withMessage("Area is required"),
  body("address.street").optional({ values: "falsy" }).trim(),
  body("address.fullAddress").optional({ values: "falsy" }).trim(),
  body("address.pincode").optional({ values: "falsy" }).trim(),
  body("images")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("images must be an array or a JSON string array");
    }),
  body("amenities")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("amenities must be an array or a JSON string array");
    }),
  body("rules")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("rules must be an array or a JSON string array");
    }),
];

export const hostelIdParamRules = [param("hostelId").isMongoId().withMessage("Invalid hostel id")];
export const roomAndBedParamsRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  param("roomId").isMongoId().withMessage("Invalid room id"),
  param("bedNo")
    .isInt({ min: 1 })
    .withMessage("Invalid bed number"),
];

export const roomRequestParamsRules = [
  param("hostelId").isMongoId().withMessage("Invalid hostel id"),
  param("roomId").isMongoId().withMessage("Invalid room id"),
];

/** Same params as room requests — hostel + embedded room ids */
export const deleteRoomRules = roomRequestParamsRules;

export const roomRequestBodyRules = [
  body("message").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
];

export const respondHostelRoomRequestRules = [
  body("requestId").isMongoId().withMessage("Invalid request id"),
  body("status")
    .isIn(["accepted", "rejected"])
    .withMessage("status must be accepted or rejected"),
  body("note").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
];
