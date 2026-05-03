import { Request } from "./request.model.js";
import { Property } from "../properties/properties.model.js";
import { sendError, sendSuccess } from "../../utils/http.js";

// 1. Tenant sends a request
export const sendInterestRequest = async (req, res) => {
  try {
    const { propertyId, message } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return sendError(res, 404, "PROPERTY_NOT_FOUND", "Property not found");

    // Create the connection
    const newRequest = await Request.create({
      property: propertyId,
      tenant: req.userId,
      landlord: property.landlord,
      tenantMessage: message
    });

    return sendSuccess(res, newRequest, { status: 201, message: "Interest sent to landlord" });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, "REQUEST_ALREADY_EXISTS", "Request already exists");
    }
    return sendError(res, 500, "REQUEST_SEND_FAILED", "Failed to send request");
  }
};

// 2. Landlord gets their "Inbox" of requests
export const getLandlordInbox = async (req, res) => {
  try {
    // Populate tenant profile so landlord can "vet" the record
    const inbox = await Request.find({ landlord: req.userId })
      .populate("tenant", "username profile address")
      .populate("property", "title address price")
      .sort("-createdAt");

    return sendSuccess(res, inbox);
  } catch (error) {
    return sendError(res, 500, "REQUEST_INBOX_FETCH_FAILED", "Failed to fetch inbox");
  }
};

// 3. Landlord accepts/rejects the request
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status, note, availabilityDate } = req.body;

    const updatedRequest = await Request.findOneAndUpdate(
      { _id: requestId, landlord: req.userId }, // Security: Must be the owner
      { 
        status, 
        landlordNote: note, 
        availabilityDate 
      },
      { new: true }
    );

    if (!updatedRequest) return sendError(res, 404, "REQUEST_NOT_FOUND", "Request not found");

    return sendSuccess(res, updatedRequest, { message: `Request ${status} successfully` });
  } catch (error) {
    return sendError(res, 500, "REQUEST_STATUS_UPDATE_FAILED", "Failed to update request");
  }
};

// 4. Tenant gets their "Sent Requests" history
export const getTenantRequests = async (req, res) => {
  try {
    // Find all requests made by this tenant
    const myRequests = await Request.find({ tenant: req.userId })
      .populate("landlord", "username profile.firstName profile.phoneNumber")
      .populate("property", "title address price images")
      .sort("-createdAt")
      .lean(); // Use lean for faster read performance

    return sendSuccess(res, myRequests, { meta: { count: myRequests.length } });
  } catch (error) {
    return sendError(res, 500, "REQUEST_LIST_FAILED", "Failed to fetch tenant requests");
  }
};