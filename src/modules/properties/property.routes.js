import express from "express";
import {
  createProperty,
  getMyProperties,
  getAllProperties,
} from "./property.controller.js";
import { protect, allowRoles } from "../../middleware/auth.middleware.js";
import { propertyRules } from "./property.validate.js";
import { handleValidation } from "../auth/auth.validation.js";

const propertyRoute = express.Router();

propertyRoute.post(
  "/create",
  protect,
  allowRoles("landlord", "hostel_owner"),
  
  ...propertyRules,
  handleValidation,
  createProperty
);

propertyRoute.get(
  "/my-listings",
  protect,
  allowRoles("landlord", "hostel_owner"),
  getMyProperties
);

propertyRoute.get("/", getAllProperties);

export default propertyRoute;