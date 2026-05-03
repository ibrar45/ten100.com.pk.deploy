import express from "express";
import { protect, allowRoles } from "../../middleware/auth.middleware.js";
import { handleValidation } from "../auth/auth.validation.js";
import { updateBedStatus } from "../hostel/hostel.controller.js";
import { updateBedRules } from "../hostel/hostel.validate.js";

const bedRouter = express.Router();

bedRouter.patch(
  "/:bedId",
  protect,
  allowRoles("owner", "hostel_owner"),
  ...updateBedRules,
  handleValidation,
  updateBedStatus
);

export default bedRouter;
