import { Hostel } from "./hostel.model.js";
import { HostelRoomRequest } from "./hostelRoomRequest.model.js";
import { Bed } from "./bed.model.js";
import { sendError, sendSuccess } from "../../utils/http.js";

export const createHostelRoomRequest = async (req, res) => {
  try {
    const { hostelId, roomId } = req.params;
    const { message } = req.body;

    const hostel = await Hostel.findOne({
      _id: hostelId,
      listingStatus: "published",
      isActive: true,
    });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or not listed");
    }

    const room = hostel.rooms.id(roomId);
    if (!room) {
      return sendError(res, 404, "ROOM_NOT_FOUND", "Room not found");
    }

    if (String(hostel.owner) === String(req.userId)) {
      return sendError(res, 400, "ROOM_REQUEST_OWN_HOSTEL", "You cannot request your own hostel");
    }

    if (room.status === "maintenance") {
      return sendError(res, 400, "ROOM_NOT_AVAILABLE", "This room is not available for requests");
    }
    const availableBeds = await Bed.countDocuments({
      hostelId,
      roomId,
      isActive: true,
      isListed: true,
      status: "available",
    });
    if (availableBeds < 1) {
      return sendError(res, 400, "ROOM_NOT_AVAILABLE", "No available beds for this room");
    }

    const doc = await HostelRoomRequest.create({
      hostel: hostelId,
      room: roomId,
      tenant: req.userId,
      owner: hostel.owner,
      tenantMessage: message,
    });

    const populated = await HostelRoomRequest.findById(doc._id)
      .populate("hostel", "name address")
      .populate("tenant", "username email profile.firstName profile.lastName")
      .populate("owner", "username email profile.firstName profile.lastName");

    return sendSuccess(res, populated, { status: 201, message: "Request sent to hostel owner" });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "ROOM_REQUEST_ALREADY_PENDING",
        "You already have a pending request for this room"
      );
    }
    return sendError(res, 500, "ROOM_REQUEST_CREATE_FAILED", "Failed to create room request");
  }
};

export const getMyHostelRoomRequests = async (req, res) => {
  try {
    const mine = await HostelRoomRequest.find({ tenant: req.userId })
      .populate("hostel", "name address listingStatus")
      .populate("owner", "username email profile.firstName profile.lastName")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, mine);
  } catch (error) {
    return sendError(res, 500, "ROOM_REQUEST_FETCH_MINE_FAILED", "Failed to fetch room requests");
  }
};

export const getHostelOwnerRoomRequestInbox = async (req, res) => {
  try {
    const inbox = await HostelRoomRequest.find({ owner: req.userId })
      .populate("tenant", "username email profile phoneNumber address")
      .populate("hostel", "name address")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, inbox);
  } catch (error) {
    return sendError(res, 500, "ROOM_REQUEST_FETCH_INBOX_FAILED", "Failed to fetch inbox");
  }
};

export const respondHostelRoomRequest = async (req, res) => {
  try {
    const { requestId, status, note } = req.body;

    const existing = await HostelRoomRequest.findOne({
      _id: requestId,
      owner: req.userId,
    });
    if (!existing) {
      return sendError(res, 404, "ROOM_REQUEST_NOT_FOUND", "Request not found");
    }
    if (existing.status !== "pending") {
      return sendError(
        res,
        400,
        "ROOM_REQUEST_ALREADY_RESOLVED",
        "This request has already been answered"
      );
    }

    const updated = await HostelRoomRequest.findByIdAndUpdate(
      requestId,
      { status, ownerNote: note },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, updated, { message: `Request ${status}` });
  } catch (error) {
    return sendError(res, 500, "ROOM_REQUEST_RESPOND_FAILED", "Failed to respond room request");
  }
};
