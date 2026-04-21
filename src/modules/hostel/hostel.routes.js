import express from "express";
import { protect, allowRoles } from "../../middleware/auth.middleware.js";
import { handleValidation } from "../auth/auth.validation.js";
import {
  addRoomToHostel,
  createHostel,
  getAllHostels,
  getHostelById,
  getMyHostels,
} from "./hostel.controller.js";
import { addRoomRules, createHostelRules } from "./hostel.validate.js";

const hostelRouter = express.Router();

hostelRouter.post(
  "/create",
  protect,
  allowRoles("hostel_owner"),
  ...createHostelRules,
  handleValidation,
  createHostel
);

hostelRouter.post(
  "/:hostelId/rooms",
  protect,
  allowRoles("hostel_owner"),
  ...addRoomRules,
  handleValidation,
  addRoomToHostel
);

hostelRouter.get(
  "/my-hostels",
  protect,
  allowRoles("hostel_owner", ),
  getMyHostels
);

hostelRouter.get("/", getAllHostels);

hostelRouter.get(
  "/:hostelId",
  protect,
  allowRoles("hostel_owner", ),
  getHostelById
);

export default hostelRouter;
