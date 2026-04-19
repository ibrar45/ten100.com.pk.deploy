import express from "express";
import { 
  sendInterestRequest, 
  getLandlordInbox, 
  updateRequestStatus,
  getTenantRequests 
} from "./request.controller.js";
import { protect, allowRoles } from "../../middleware/auth.middleware.js";

const requestRouter = express.Router();

requestRouter.use(protect); // All routes require login

// Tenant Route
requestRouter.post("/send", allowRoles("tenant"), sendInterestRequest);

// Landlord Routes
requestRouter.get("/inbox", allowRoles("landlord", "hostel_owner"), getLandlordInbox);
requestRouter.patch("/respond", allowRoles("landlord", "hostel_owner"), updateRequestStatus);
requestRouter.get("/my-requests",allowRoles("tenant"), getTenantRequests);
export default requestRouter;