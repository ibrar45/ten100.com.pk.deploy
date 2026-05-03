import express from "express";
import { protect, allowRoles, optionalProtect } from "../../middleware/auth.middleware.js";
import { handleValidation } from "../auth/auth.validation.js";
import {
  addRoomToHostel,
  createHostel,
  deleteHostel,
  deleteRoomFromHostel,
  editRoomInHostel,
  editHostel,
  getAllHostels,
  getAllHostelBeds,
  getAllHostelRooms,
  getBestHostels,
  getHostelDetail,
  getHostelRooms,
  getOwnerDashboardAnalyticsController,
  getMyHostels,
  publishHostel,
  getSingleBedDetail,
  trackHostelCallClick,
} from "./hostel.controller.js";
import {
  createHostelRoomRequest,
  getHostelOwnerRoomRequestInbox,
  getMyHostelRoomRequests,
  respondHostelRoomRequest,
} from "./hostel.request.controller.js";
import {
  getHostelChatHistory,
  getOwnerChatConversations,
  getMyChatConversations,
} from "./hostelChat.controller.js";
import {
  normalizeMultipartBody,
  uploadHostelImages,
  uploadRoomImages,
} from "../../middleware/upload.middleware.js";
import {
  addRoomRules,
  createHostelRules,
  hostelIdParamRules,
  publishHostelRules,
  roomAndBedParamsRules,
  respondHostelRoomRequestRules,
  deleteRoomRules,
  roomRequestBodyRules,
  roomRequestParamsRules,
  updateRoomRules,
  updateHostelRules,
} from "./hostel.validate.js";

const hostelRouter = express.Router();

hostelRouter.get("/", getAllHostels);
hostelRouter.get("/best", getBestHostels);
hostelRouter.get("/rooms", getAllHostelRooms);
hostelRouter.get("/rooms/beds", getAllHostelBeds);
hostelRouter.get(
  "/rooms/beds/:hostelId/:roomId/:bedNo",
  ...roomAndBedParamsRules,
  handleValidation,
  getSingleBedDetail
);

hostelRouter.get(
  "/room-requests/mine",
  protect,
  allowRoles("user", "tenant"),
  getMyHostelRoomRequests
);
hostelRouter.get(
  "/room-requests/inbox",
  protect,
  allowRoles("owner", "hostel_owner"),
  getHostelOwnerRoomRequestInbox
);
hostelRouter.patch(
  "/room-requests/respond",
  protect,
  allowRoles("owner", "hostel_owner"),
  respondHostelRoomRequestRules,
  handleValidation,
  respondHostelRoomRequest
);

hostelRouter.get(
  "/owner/dashboard-analytics",
  protect,
  allowRoles("owner", "hostel_owner"),
  getOwnerDashboardAnalyticsController
);

/** Messages inbox: `{ id, hostelId, peerId, hostelName, peerDisplayName, preview, lastMessage, updatedAt }[]` */
hostelRouter.get(
  "/owner/chat/conversations",
  protect,
  allowRoles("owner", "hostel_owner"),
  getOwnerChatConversations
);

/** Tenant/user inbox for chats they've participated in */
hostelRouter.get(
  "/my/chat/conversations",
  protect,
  allowRoles("user", "tenant"),
  getMyChatConversations
);

hostelRouter.get(
  "/my-hostels",
  protect,
  allowRoles("owner", "hostel_owner"),
  getMyHostels
);
hostelRouter.get("/my", protect, allowRoles("owner", "hostel_owner"), getMyHostels);

hostelRouter.post(
  "/create",
  protect,
  allowRoles("user", "owner", "hostel_owner"),
  uploadHostelImages,
  normalizeMultipartBody,
  ...createHostelRules,
  handleValidation,
  createHostel
);

hostelRouter.post(
  "/:hostelId/rooms/:roomId/request",
  protect,
  allowRoles("user", "tenant"),
  ...roomRequestParamsRules,
  ...roomRequestBodyRules,
  handleValidation,
  createHostelRoomRequest
);

hostelRouter.post(
  "/:hostelId/rooms",
  protect,
  allowRoles("owner", "hostel_owner"),
  uploadRoomImages,
  normalizeMultipartBody,
  ...addRoomRules,
  handleValidation,
  addRoomToHostel
);

hostelRouter.patch(
  "/:hostelId/rooms/:roomId",
  protect,
  allowRoles("owner", "hostel_owner"),
  uploadRoomImages,
  normalizeMultipartBody,
  ...updateRoomRules,
  handleValidation,
  editRoomInHostel
);

hostelRouter.delete(
  "/:hostelId/rooms/:roomId",
  protect,
  allowRoles("owner", "hostel_owner"),
  ...deleteRoomRules,
  handleValidation,
  deleteRoomFromHostel
);

hostelRouter.patch(
  "/:hostelId",
  protect,
  allowRoles("owner", "hostel_owner"),
  uploadHostelImages,
  normalizeMultipartBody,
  ...updateHostelRules,
  handleValidation,
  editHostel
);

hostelRouter.patch(
  "/:hostelId/publish",
  protect,
  allowRoles("owner", "hostel_owner"),
  ...publishHostelRules,
  handleValidation,
  publishHostel
);

hostelRouter.post(
  "/:hostelId/call-click",
  protect,
  allowRoles("user", "tenant"),
  ...hostelIdParamRules,
  handleValidation,
  trackHostelCallClick
);

hostelRouter.delete(
  "/:hostelId",
  protect,
  allowRoles("owner", "hostel_owner"),
  ...hostelIdParamRules,
  handleValidation,
  deleteHostel
);

hostelRouter.get("/:hostelId/rooms", optionalProtect, ...hostelIdParamRules, handleValidation, getHostelRooms);

hostelRouter.get(
  "/:hostelId/chat",
  protect,
  allowRoles("user", "tenant", "owner", "hostel_owner"),
  getHostelChatHistory
);

hostelRouter.get("/:hostelId", optionalProtect, getHostelDetail);

export default hostelRouter;
