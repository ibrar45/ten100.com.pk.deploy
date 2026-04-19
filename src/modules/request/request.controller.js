import { Request } from "./request.model.js";
import { Property } from "../properties/properties.model.js";

// 1. Tenant sends a request
export const sendInterestRequest = async (req, res) => {
  try {
    const { propertyId, message } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Create the connection
    const newRequest = await Request.create({
      property: propertyId,
      tenant: req.userId,
      landlord: property.landlord,
      tenantMessage: message
    });

    res.status(201).json({ success: true, message: "Interest sent to landlord", data: newRequest });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Request already exists" });
    res.status(500).json({ success: false, message: error.message });
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

    res.status(200).json({ success: true, data: inbox });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    if (!updatedRequest) return res.status(404).json({ message: "Request not found" });

    res.status(200).json({ 
      success: true, 
      message: `Request ${status} successfully`, 
      data: updatedRequest 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.status(200).json({
      success: true,
      count: myRequests.length,
      data: myRequests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};