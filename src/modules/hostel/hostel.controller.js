import { Hostel } from "./hostel.model.js";
import User from "../auth/user.model.js";
import { generateToken } from "../../utils/generateToken.js";
import { HostelCallLog } from "./hostelCallLog.model.js";
import { HostelViewLog } from "./hostelViewLog.model.js";
import { HostelRoomRequest } from "./hostelRoomRequest.model.js";
import { Bed } from "./bed.model.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../../utils/http.js";
import { logger } from "../../config/logger.js";
import { getOwnerDashboardAnalytics } from "./dashboardAnalytics.service.js";

const isProd = process.env.NODE_ENV === "production";

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (_error) {
    // Fallback to comma-separated text for form-data convenience.
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseBooleanLike(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return Boolean(value);
}

function buildUploadedUrls(files = []) {
  return files
    .map((file) => {
      const relativePath = file.path.split(/uploads[\\/]/).pop()?.replaceAll("\\", "/") || "";
      return relativePath ? `/uploads/${relativePath}` : null;
    })
    .filter(Boolean);
}

function toAbsoluteUrl(req, url) {
  if (typeof url !== "string" || !url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${req.protocol}://${req.get("host")}${url}`;
  return url;
}

function roomDisplayPrice(room, isShortStayAvailable) {
  if (isShortStayAvailable && Number(room.rentPerBedPerDay) > 0) {
    return `Rs. ${Number(room.rentPerBedPerDay)} / day`;
  }
  return `Rs. ${Number(room.rentPerBed || 0)} / month`;
}

async function createBedsForRoom({ hostel, room, seatStart = 1, seatEnd }) {
  if (seatEnd < seatStart) return;
  const docs = [];
  for (let bedNumber = seatStart; bedNumber <= seatEnd; bedNumber += 1) {
    docs.push({
      hostelId: hostel._id,
      roomId: room._id,
      owner: hostel.owner,
      bedNumber,
      status: "available",
      isListed: true,
      isActive: true,
      rentPerBed: Number(room.rentPerBed) || 0,
      rentPerBedPerDay: room.rentPerBedPerDay,
    });
  }
  if (docs.length > 0) await Bed.insertMany(docs, { ordered: true });
}

async function syncBedsForRoomSeatChange({ hostel, room, prevSeats, nextSeats }) {
  if (nextSeats > prevSeats) {
    await createBedsForRoom({
      hostel,
      room,
      seatStart: prevSeats + 1,
      seatEnd: nextSeats,
    });
    return;
  }
  if (nextSeats < prevSeats) {
    await Bed.updateMany(
      {
        roomId: room._id,
        owner: hostel.owner,
        bedNumber: { $gt: nextSeats },
      },
      { $set: { isActive: false, isListed: false, status: "blocked" } }
    );
  }
}

async function syncRoomPricingToBeds({ hostel, room }) {
  await Bed.updateMany(
    { roomId: room._id, owner: hostel.owner, isActive: true },
    {
      $set: {
        rentPerBed: Number(room.rentPerBed) || 0,
        rentPerBedPerDay: room.rentPerBedPerDay,
      },
    }
  );
}

async function recomputeRoomDerivedFields({ hostelId, roomId, owner }) {
  const [totalBeds, availableBeds] = await Promise.all([
    Bed.countDocuments({ roomId, owner, isActive: true }),
    Bed.countDocuments({
      roomId,
      owner,
      isActive: true,
      status: "available",
      isListed: true,
    }),
  ]);
  const sharingType = totalBeds;
  await Hostel.updateOne(
    { _id: hostelId, "rooms._id": roomId },
    {
      $set: {
        "rooms.$.totalSeats": totalBeds,
        "rooms.$.availableSeats": availableBeds,
        "rooms.$.sharingType": sharingType,
      },
    }
  );
  return { totalBeds, availableBeds, sharingType };
}

async function getBedsByRoomIds(roomIds, { ownerId, publicOnlyListed = false } = {}) {
  if (!Array.isArray(roomIds) || roomIds.length === 0) return new Map();
  const query = { roomId: { $in: roomIds }, isActive: true };
  if (ownerId) query.owner = ownerId;
  if (publicOnlyListed) query.isListed = true;
  const beds = await Bed.find(query).sort({ bedNumber: 1 }).lean();
  const map = new Map();
  for (const bed of beds) {
    const key = String(bed.roomId);
    const list = map.get(key) || [];
    list.push(bed);
    map.set(key, list);
  }
  return map;
}

async function ensureBedsForHostel(hostel) {
  const rooms = Array.isArray(hostel?.rooms) ? hostel.rooms : [];
  if (!hostel?._id || rooms.length === 0) return;
  const roomIds = rooms.map((r) => r._id);
  const existing = await Bed.find({ hostelId: hostel._id, roomId: { $in: roomIds } })
    .select("roomId bedNumber isActive")
    .lean();
  const map = new Map();
  for (const bed of existing) {
    const key = String(bed.roomId);
    const set = map.get(key) || new Set();
    set.add(Number(bed.bedNumber));
    map.set(key, set);
  }

  const inserts = [];
  for (const room of rooms) {
    const totalSeats = Number(room.totalSeats) || 0;
    if (totalSeats < 1) continue;
    const present = map.get(String(room._id)) || new Set();
    for (let n = 1; n <= totalSeats; n += 1) {
      if (present.has(n)) continue;
      inserts.push({
        hostelId: hostel._id,
        roomId: room._id,
        owner: hostel.owner?._id || hostel.owner,
        bedNumber: n,
        status: "available",
        isListed: true,
        isActive: true,
        rentPerBed: Number(room.rentPerBed) || 0,
        rentPerBedPerDay: room.rentPerBedPerDay,
      });
    }
  }
  if (inserts.length > 0) {
    await Bed.insertMany(inserts, { ordered: false });
  }
}

function mapRoomImageUrls(rooms = [], req, isShortStayAvailable = false) {
  return rooms.map((room) => ({
    ...room,
    images: (room.images || []).map((img) => toAbsoluteUrl(req, img)),
    displayPrice: roomDisplayPrice(room, isShortStayAvailable),
  }));
}

function normalizeHostelForResponse(hostel, req) {
  if (!hostel) return hostel;
  const plain = typeof hostel.toObject === "function" ? hostel.toObject() : { ...hostel };
  return {
    ...plain,
    images: (plain.images || []).map((img) => toAbsoluteUrl(req, img)),
    rooms: Array.isArray(plain.rooms)
      ? mapRoomImageUrls(plain.rooms, req, Boolean(plain.isShortStayAvailable))
      : plain.rooms,
  };
}

function resolveRoomDailyPricing(hostel, body) {
  const hasShortStay = Boolean(hostel.isShortStayAvailable);
  const rawDaily = body.rentPerBedPerDay;
  if (hasShortStay) {
    const value = Number(rawDaily);
    if (!Number.isFinite(value) || value <= 0) {
      return { error: "rentPerBedPerDay is required and must be greater than 0" };
    }
    return { rentPerBedPerDay: value };
  }
  return { rentPerBedPerDay: undefined };
}

function isProfileComplete(user) {
  const p = user?.profile || {};
  const a = user?.address || {};
  return Boolean(
    p.firstName &&
      p.lastName &&
      p.phoneNumber &&
      p.gender &&
      p.dateOfBirth &&
      a.street &&
      a.city &&
      a.state &&
      a.zipCode
  );
}

export const createHostel = async (req, res) => {
  try {
    const { name, code, genderPolicy, totalFloors, contact, address, amenities, rules } =
      req.body;

    const currentUser = await User.findOne({ _id: req.userId, isDeleted: false });
    if (!currentUser) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }
    if (!isProfileComplete(currentUser)) {
      return sendError(
        res,
        400,
        "PROFILE_INCOMPLETE",
        "Complete your profile before creating a hostel"
      );
    }

    const ownerRole = currentUser.role === "user" ? "owner" : currentUser.role;
    if (!["owner", "hostel_owner"].includes(ownerRole)) {
      return sendError(res, 403, "HOSTEL_CREATE_FORBIDDEN", "Only owner accounts can create hostels");
    }

    const uploadedImages = buildUploadedUrls(Array.isArray(req.files) ? req.files : []);
    const bodyImages = parseArrayField(req.body.images);
    const imageUrls = [...uploadedImages, ...bodyImages];

    const hostel = await Hostel.create({
      owner: req.userId,
      name,
      code,
      genderPolicy,
      isShortStayAvailable: parseBooleanLike(req.body.isShortStayAvailable, false),
      totalFloors:
        totalFloors === undefined || totalFloors === null || totalFloors === ""
          ? 0
          : Number(totalFloors),
      contact,
      address,
      images: imageUrls,
      amenities: parseArrayField(amenities),
      rules: parseArrayField(rules),
      rooms: [],
      listingStatus: "draft",
    });

    if (currentUser.role === "user") {
      currentUser.role = "owner";
      await currentUser.save();
      generateToken(res, currentUser._id, currentUser.role, { isProd });
    }

    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      status: 201,
      message: "Hostel created successfully",
    });
  } catch (error) {
    logger.error("hostel_create_failed", {
      message: error?.message,
      code: error?.code,
    });
    if (error?.code === 11000) {
      return sendError(res, 409, "HOSTEL_DUPLICATE", "Hostel with same name/code already exists");
    }
    return sendError(res, 500, "HOSTEL_CREATE_FAILED", "Failed to create hostel");
  }
};

export const addRoomToHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const {
      roomNo,
      floorNumber,
      totalSeats,
      attachedBath,
      acAvailable,
      geyserAvailable,
      rentPerBed,
      securityDeposit,
      roomType,
      furnishing,
      hasBalcony,
      hasWifi,
      status,
      notes,
    } = req.body;

    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }

    const duplicateRoom = hostel.rooms.find(
      (room) =>
        room.roomNo?.toLowerCase() === String(roomNo).toLowerCase() &&
        Number(room.floorNumber) === Number(floorNumber)
    );

    if (duplicateRoom) {
      return sendError(res, 409, "ROOM_DUPLICATE", "Room already exists on this floor");
    }

    const nextAvailableSeats = Number(totalSeats);

    const uploadedImages = buildUploadedUrls(Array.isArray(req.files) ? req.files : []);
    const bodyImages = parseArrayField(req.body.images);
    const imageUrls = [...uploadedImages, ...bodyImages];
    const shortStayPricing = resolveRoomDailyPricing(hostel, req.body);
    if (shortStayPricing.error) {
      return sendError(
        res,
        400,
        "ROOM_DAILY_RENT_REQUIRED",
        shortStayPricing.error
      );
    }

    hostel.rooms.push({
      roomNo,
      floorNumber: Number(floorNumber),
      totalSeats: Number(totalSeats),
      availableSeats: nextAvailableSeats,
      attachedBath: Boolean(attachedBath),
      acAvailable: Boolean(acAvailable),
      geyserAvailable: Boolean(geyserAvailable),
      sharingType: Number(totalSeats),
      rentPerBed: Number(rentPerBed),
      rentPerBedPerDay: shortStayPricing.rentPerBedPerDay,
      securityDeposit:
        securityDeposit === undefined || securityDeposit === null || securityDeposit === ""
          ? 0
          : Number(securityDeposit),
      roomType,
      furnishing,
      hasBalcony: Boolean(hasBalcony),
      hasWifi: Boolean(hasWifi),
      status,
      notes,
      images: imageUrls,
    });

    await hostel.save();
    const room = hostel.rooms[hostel.rooms.length - 1];
    await createBedsForRoom({
      hostel,
      room,
      seatStart: 1,
      seatEnd: Number(room.totalSeats) || 0,
    });
    await recomputeRoomDerivedFields({
      hostelId: hostel._id,
      roomId: room._id,
      owner: hostel.owner,
    });

    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      status: 201,
      message: "Room added successfully",
    });
  } catch (error) {
    return sendError(res, 500, "ROOM_CREATE_FAILED", "Failed to add room");
  }
};

export const editRoomInHostel = async (req, res) => {
  try {
    const { hostelId, roomId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId, isActive: true });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }
    const room = hostel.rooms.id(roomId);
    if (!room) {
      return sendError(res, 404, "ROOM_NOT_FOUND", "Room not found");
    }

    const uploadedImages = buildUploadedUrls(Array.isArray(req.files) ? req.files : []);
    const bodyImages = parseArrayField(req.body.images);
    const mergedImages = [...uploadedImages, ...bodyImages];

    const prevSeats = Number(room.totalSeats) || 0;
    const fields = [
      "roomNo",
      "floorNumber",
      "totalSeats",
      "attachedBath",
      "acAvailable",
      "geyserAvailable",
      "rentPerBed",
      "rentPerBedPerDay",
      "securityDeposit",
      "roomType",
      "furnishing",
      "hasBalcony",
      "hasWifi",
      "status",
      "notes",
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) room[key] = req.body[key];
    }
    if (req.body.images !== undefined || uploadedImages.length > 0) room.images = mergedImages;

    const nextSeats = Number(room.totalSeats) || 0;
    if (nextSeats < 1) {
      return sendError(res, 400, "ROOM_SEATS_INVALID", "totalSeats must be at least 1");
    }
    room.sharingType = nextSeats;

    if (hostel.isShortStayAvailable) {
      const dayRent = Number(room.rentPerBedPerDay);
      if (!Number.isFinite(dayRent) || dayRent <= 0) {
        return sendError(
          res,
          400,
          "ROOM_DAILY_RENT_REQUIRED",
          "rentPerBedPerDay is required and must be greater than 0"
        );
      }
    } else {
      room.rentPerBedPerDay = undefined;
    }

    await hostel.save();
    await syncBedsForRoomSeatChange({ hostel, room, prevSeats, nextSeats });
    await syncRoomPricingToBeds({ hostel, room });
    await recomputeRoomDerivedFields({
      hostelId: hostel._id,
      roomId: room._id,
      owner: hostel.owner,
    });

    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      message: "Room updated successfully",
    });
  } catch (_error) {
    return sendError(res, 500, "ROOM_UPDATE_FAILED", "Failed to update room");
  }
};

export const deleteRoomFromHostel = async (req, res) => {
  try {
    const { hostelId, roomId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId, isActive: true });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }
    const room = hostel.rooms.id(roomId);
    if (!room) {
      return sendError(res, 404, "ROOM_NOT_FOUND", "Room not found");
    }

    const occupied = await Bed.exists({
      roomId,
      hostelId: hostel._id,
      status: "occupied",
    });
    if (occupied) {
      return sendError(
        res,
        409,
        "ROOM_HAS_OCCUPIED_BEDS",
        "Cannot delete a room while beds are occupied"
      );
    }

    await HostelRoomRequest.updateMany(
      { room: roomId, status: "pending" },
      { $set: { status: "rejected", ownerNote: "Room removed by owner" } }
    );
    await Bed.deleteMany({ roomId, hostelId: hostel._id, owner: hostel.owner });

    hostel.rooms.pull(roomId);
    if (hostel.rooms.length === 0 && hostel.listingStatus === "published") {
      hostel.listingStatus = "draft";
    }
    await hostel.save();

    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      message: "Room deleted successfully",
    });
  } catch (_error) {
    return sendError(res, 500, "ROOM_DELETE_FAILED", "Failed to delete room");
  }
};

export const updateBedStatus = async (req, res) => {
  try {
    const { bedId } = req.params;
    const bed = await Bed.findById(bedId);
    if (!bed || !bed.isActive) {
      return sendError(res, 404, "BED_NOT_FOUND", "Bed not found");
    }
    if (String(bed.owner) !== String(req.userId)) {
      return sendError(res, 403, "FORBIDDEN", "Forbidden");
    }
    if (req.body.status !== undefined) bed.status = req.body.status;
    if (req.body.isListed !== undefined) bed.isListed = parseBooleanLike(req.body.isListed, bed.isListed);
    await bed.save();
    await recomputeRoomDerivedFields({
      hostelId: bed.hostelId,
      roomId: bed.roomId,
      owner: bed.owner,
    });
    return sendSuccess(res, bed, { message: "Bed updated successfully" });
  } catch (_error) {
    return sendError(res, 500, "BED_UPDATE_FAILED", "Failed to update bed");
  }
};

export const getMyHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ owner: req.userId }).sort({ createdAt: -1 });
    return sendSuccess(
      res,
      hostels.map((hostel) => normalizeHostelForResponse(hostel, req))
    );
  } catch (error) {
    return sendError(res, 500, "HOSTEL_LIST_MINE_FAILED", "Failed to fetch your hostels");
  }
};

export const editHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId, isActive: true });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }

    const uploadedImages = buildUploadedUrls(Array.isArray(req.files) ? req.files : []);
    const bodyImages = parseArrayField(req.body.images);
    const mergedImages = [...uploadedImages, ...bodyImages];

    const fields = ["name", "code", "genderPolicy"];
    for (const key of fields) {
      if (req.body[key] !== undefined) hostel[key] = req.body[key];
    }
    if (req.body.totalFloors !== undefined) hostel.totalFloors = Number(req.body.totalFloors);
    if (req.body.isShortStayAvailable !== undefined) {
      hostel.isShortStayAvailable = parseBooleanLike(req.body.isShortStayAvailable);
    }
    if (req.body.contact !== undefined) hostel.contact = req.body.contact || {};
    if (req.body.address !== undefined) hostel.address = req.body.address || {};
    if (req.body.amenities !== undefined) hostel.amenities = parseArrayField(req.body.amenities);
    if (req.body.rules !== undefined) hostel.rules = parseArrayField(req.body.rules);
    if (req.body.images !== undefined || uploadedImages.length > 0) hostel.images = mergedImages;

    await hostel.save();
    if (!hostel.isShortStayAvailable) {
      await Bed.updateMany(
        { hostelId: hostel._id, owner: hostel.owner, isActive: true },
        { $unset: { rentPerBedPerDay: "" } }
      );
    }
    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      message: "Hostel updated successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 409, "HOSTEL_DUPLICATE", "Hostel with same name/code already exists");
    }
    return sendError(res, 500, "HOSTEL_UPDATE_FAILED", "Failed to update hostel");
  }
};

export const deleteHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId, isActive: true });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }
    hostel.isActive = false;
    hostel.listingStatus = "draft";
    await hostel.save();
    await Bed.updateMany({ hostelId: hostel._id, owner: hostel.owner }, { $set: { isActive: false } });
    return sendSuccess(res, undefined, { message: "Hostel deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "HOSTEL_DELETE_FAILED", "Failed to delete hostel");
  }
};

export const getAllHostels = async (req, res) => {
  try {
    const { city, minPrice, maxPrice, seats, amenities } = req.query;
    const query = {
      isActive: true,
      $or: [{ listingStatus: "published" }, { listingStatus: { $exists: false } }],
    };

    if (city) query["address.city"] = { $regex: `^${String(city).trim()}$`, $options: "i" };

    const roomMatch = {};
    const minPriceNum = Number(minPrice);
    const maxPriceNum = Number(maxPrice);
    if (Number.isFinite(minPriceNum) || Number.isFinite(maxPriceNum)) {
      roomMatch.rentPerBed = {};
      if (Number.isFinite(minPriceNum)) roomMatch.rentPerBed.$gte = minPriceNum;
      if (Number.isFinite(maxPriceNum)) roomMatch.rentPerBed.$lte = maxPriceNum;
    }
    const seatsNum = Number(seats);
    if (Object.keys(roomMatch).length > 0) query.rooms = { $elemMatch: roomMatch };

    const amenityValues = String(amenities || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (amenityValues.length > 0) query.amenities = { $all: amenityValues };

    const list = await Hostel.find(query)
      .populate("owner", "username email role profile.firstName profile.lastName")
      .sort({ createdAt: -1 })
      .lean();
    await Promise.all(list.map((hostel) => ensureBedsForHostel(hostel)));

    const hostelIds = list.map((h) => h._id);
    const bedAgg = await Bed.aggregate([
      {
        $match: {
          hostelId: { $in: hostelIds },
          isActive: true,
          isListed: true,
          status: "available",
        },
      },
      { $group: { _id: "$hostelId", availableBeds: { $sum: 1 } } },
    ]);
    const availableBedsByHostel = new Map(
      bedAgg.map((row) => [String(row._id), Number(row.availableBeds) || 0])
    );

    const data = list
      .map((h) => {
      const rooms = h.rooms || [];
      const availableRoomCount = rooms.filter((r) =>
        ["available", "partially_occupied"].includes(r.status)
      ).length;
      const { rooms: _r, ...rest } = h;
      const availableBeds = availableBedsByHostel.get(String(h._id)) || 0;
      return {
        ...rest,
        images: (rest.images || []).map((img) => toAbsoluteUrl(req, img)),
        totalRoomCount: rooms.length,
        availableRoomCount,
        totalAvailableSeats: availableBeds,
      };
    })
      .filter((item) => !Number.isFinite(seatsNum) || item.totalAvailableSeats >= seatsNum);

    return sendSuccess(res, data);
  } catch (error) {
    return sendError(res, 500, "HOSTEL_LIST_FAILED", "Failed to fetch hostels");
  }
};

/** Public detail for published hostels; owner can also load their own drafts. */
export const getHostelDetail = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findById(hostelId).populate(
      "owner",
      "username email role profile.firstName profile.lastName profile.phoneNumber"
    );

    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }

    const ownerId = String(hostel.owner?._id || hostel.owner);
    const isOwner = req.userId && ownerId === String(req.userId);
    const isPublished =
      hostel.listingStatus === "published" || hostel.listingStatus == null;

    if (!hostel.isActive && !isOwner) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }
    if (!isPublished && !isOwner) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }

    if (!isOwner) {
      await Hostel.updateOne({ _id: hostel._id }, { $inc: { viewCount: 1 } });
      await HostelViewLog.create({
        hostel: hostel._id,
        owner: ownerId,
        viewer: req.userId || undefined,
      });
      hostel.viewCount = Number(hostel.viewCount || 0) + 1;
    }

    return sendSuccess(res, normalizeHostelForResponse(hostel, req));
  } catch (error) {
    return sendError(res, 500, "HOSTEL_DETAIL_FAILED", "Failed to fetch hostel detail");
  }
};

export const publishHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId });
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found or you are not allowed");
    }
    if (!hostel.rooms?.length) {
      return sendError(res, 400, "HOSTEL_PUBLISH_NO_ROOMS", "Add at least one room before publishing");
    }
    hostel.listingStatus = "published";
    await hostel.save();
    return sendSuccess(res, normalizeHostelForResponse(hostel, req), {
      message: "Hostel is now visible on the public list",
    });
  } catch (error) {
    return sendError(res, 500, "HOSTEL_PUBLISH_FAILED", "Failed to publish hostel");
  }
};

export const getHostelRooms = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findById(hostelId).select(
      "name owner rooms listingStatus isActive"
    );
    if (!hostel) return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");

    const isOwner = req.userId && String(hostel.owner) === String(req.userId);
    const isPublished = hostel.listingStatus === "published" || hostel.listingStatus == null;
    if (!isOwner && (!hostel.isActive || !isPublished)) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }

    await ensureBedsForHostel(hostel);
    const rawRooms = Array.isArray(hostel.rooms) ? hostel.rooms : [];
    const roomIds = rawRooms.map((room) => room._id);
    const bedMap = await getBedsByRoomIds(roomIds, {
      ownerId: hostel.owner,
      publicOnlyListed: !isOwner,
    });
    const rooms = rawRooms.map((roomDoc) => {
      const room = roomDoc.toObject();
      const beds = bedMap.get(String(room._id)) || [];
      const availableBeds = beds.filter((b) => b.status === "available" && b.isListed).length;
      return {
        ...room,
        totalBeds: beds.length,
        availableBeds,
        sharingType: beds.length,
        beds,
        images: (room.images || []).map((img) => toAbsoluteUrl(req, img)),
        displayPrice: roomDisplayPrice(room, Boolean(hostel.isShortStayAvailable)),
      };
    });
    return sendSuccess(res, rooms);
  } catch (error) {
    return sendError(res, 500, "HOSTEL_ROOMS_FETCH_FAILED", "Failed to fetch hostel rooms");
  }
};

export const getAllHostelRooms = async (req, res) => {
  try {
    const hostels = await Hostel.find({
      isActive: true,
      $or: [{ listingStatus: "published" }, { listingStatus: { $exists: false } }],
    })
      .select("name owner address rooms isShortStayAvailable")
      .populate("owner", "username email profile.firstName profile.lastName")
      .lean();
    await Promise.all(hostels.map((hostel) => ensureBedsForHostel(hostel)));

    const allRoomIds = hostels.flatMap((hostel) =>
      (Array.isArray(hostel.rooms) ? hostel.rooms : []).map((room) => room._id)
    );
    const bedMap = await getBedsByRoomIds(allRoomIds, { publicOnlyListed: true });

    const rooms = [];
    for (const hostel of hostels) {
      const hostelRooms = Array.isArray(hostel.rooms) ? hostel.rooms : [];
      for (const room of hostelRooms) {
        const beds = bedMap.get(String(room._id)) || [];
        const availableBeds = beds.filter((b) => b.status === "available" && b.isListed).length;
        rooms.push({
          hostelId: hostel._id,
          hostelName: hostel.name,
          hostelAddress: hostel.address,
          owner: hostel.owner,
          roomId: room._id,
          roomNo: room.roomNo,
          floorNumber: room.floorNumber,
          totalSeats: room.totalSeats,
          availableSeats: room.availableSeats,
          status: room.status,
          attachedBath: room.attachedBath,
          acAvailable: room.acAvailable,
          geyserAvailable: room.geyserAvailable,
          sharingType: beds.length,
          rentPerBed: room.rentPerBed,
          rentPerBedPerDay: room.rentPerBedPerDay,
          totalBeds: beds.length,
          availableBeds,
          beds,
          displayPrice: roomDisplayPrice(room, Boolean(hostel.isShortStayAvailable)),
          images: (Array.isArray(room.images) ? room.images : []).map((img) =>
            toAbsoluteUrl(req, img)
          ),
        });
      }
    }

    return sendSuccess(res, rooms, { meta: { count: rooms.length } });
  } catch (error) {
    return sendError(res, 500, "ROOMS_FETCH_ALL_FAILED", "Failed to fetch rooms");
  }
};

export const getAllHostelBeds = async (req, res) => {
  try {
    const hostels = await Hostel.find({
      isActive: true,
      $or: [{ listingStatus: "published" }, { listingStatus: { $exists: false } }],
    }).select("name rooms isShortStayAvailable").lean();
    await Promise.all(hostels.map((hostel) => ensureBedsForHostel(hostel)));
    const hostelMap = new Map(hostels.map((h) => [String(h._id), h]));
    const beds = await Bed.find({
      hostelId: { $in: hostels.map((h) => h._id) },
      isActive: true,
      isListed: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    const data = beds.map((bed) => {
      const hostel = hostelMap.get(String(bed.hostelId));
      const room = (hostel?.rooms || []).find((r) => String(r._id) === String(bed.roomId));
      return {
        bedId: bed._id,
        hostelId: bed.hostelId,
        hostelName: hostel?.name,
        roomId: bed.roomId,
        roomNo: room?.roomNo,
        bedNo: bed.bedNumber,
        status: bed.status,
        isListed: bed.isListed,
        isAvailable: bed.status === "available",
        seatPrice: bed.rentPerBed,
        seatPricePerDay: bed.rentPerBedPerDay,
        displayPrice: roomDisplayPrice(
          { rentPerBed: bed.rentPerBed, rentPerBedPerDay: bed.rentPerBedPerDay },
          Boolean(hostel?.isShortStayAvailable)
        ),
      };
    });

    return sendSuccess(res, data, { meta: { count: data.length } });
  } catch (error) {
    return sendError(res, 500, "BEDS_FETCH_ALL_FAILED", "Failed to fetch beds");
  }
};

export const getSingleBedDetail = async (req, res) => {
  try {
    const { hostelId, roomId, bedNo } = req.params;

    const hostel = await Hostel.findOne({
      _id: hostelId,
      isActive: true,
      $or: [{ listingStatus: "published" }, { listingStatus: { $exists: false } }],
      "rooms._id": roomId,
    })
      .select("name owner address rooms isShortStayAvailable")
      .populate("owner", "username email profile.firstName profile.lastName")
      .lean();

    if (!hostel) {
      return sendError(res, 404, "HOSTEL_OR_ROOM_NOT_FOUND", "Hostel or room not found");
    }

    const room = (hostel.rooms || []).find((r) => String(r._id) === String(roomId));
    if (!room) {
      return sendError(res, 404, "ROOM_NOT_FOUND", "Room not found");
    }

    await ensureBedsForHostel(hostel);
    const bedNumber = Number(bedNo);
    const bed = await Bed.findOne({
      hostelId,
      roomId,
      bedNumber,
      isActive: true,
      isListed: true,
    }).lean();
    if (!bed) return sendError(res, 404, "BED_NOT_FOUND", "Bed not found in this room");

    const sharingCount = await Bed.countDocuments({
      roomId,
      owner: hostel.owner?._id || hostel.owner,
      isActive: true,
    });
    const sharingLabel = `${sharingCount}-sharing`;

    return sendSuccess(res, {
        bedId: bed._id,
        hostelId: hostel._id,
        hostelName: hostel.name,
        hostelAddress: hostel.address,
        owner: hostel.owner,
        roomId: room._id,
        roomNo: room.roomNo,
        floorNumber: room.floorNumber,
        bedNo: bedNumber,
        isAvailable: bed.status === "available",
        status: bed.status,
        isListed: bed.isListed,
        sharingType: sharingCount,
        sharingTypeLabel: sharingLabel,
        seatPrice: bed.rentPerBed,
        seatPricePerDay: bed.rentPerBedPerDay,
        displayPrice: roomDisplayPrice(
          { rentPerBed: bed.rentPerBed, rentPerBedPerDay: bed.rentPerBedPerDay },
          Boolean(hostel.isShortStayAvailable)
        ),
        roomImages: (Array.isArray(room.images) ? room.images : []).map((img) =>
          toAbsoluteUrl(req, img)
        ),
        roomFeatures: {
          attachedBath: room.attachedBath,
          acAvailable: room.acAvailable,
          geyserAvailable: room.geyserAvailable,
          hasWifi: room.hasWifi,
          hasBalcony: room.hasBalcony,
        },
    });
  } catch (error) {
    return sendError(res, 500, "BED_DETAIL_FETCH_FAILED", "Failed to fetch bed detail");
  }
};

export const getBestHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({
      isActive: true,
      listingStatus: "published",
    })
      .populate("owner", "username profile.firstName profile.lastName")
      .sort({ featured: -1, ratingAverage: -1, totalAvailableSeats: -1, createdAt: -1 })
      .limit(20)
      .lean();
    return sendSuccess(res, hostels);
  } catch (error) {
    return sendError(res, 500, "BEST_HOSTELS_FETCH_FAILED", "Failed to fetch best hostels");
  }
};

export const trackHostelCallClick = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({
      _id: hostelId,
      isActive: true,
      listingStatus: "published",
    }).select("owner");
    if (!hostel) return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");

    if (String(hostel.owner) === String(req.userId)) {
      return sendError(res, 400, "CALL_TRACK_SELF_FORBIDDEN", "Owner cannot track self-call");
    }

    await HostelCallLog.updateOne(
      { hostel: hostelId, user: req.userId },
      { $setOnInsert: { owner: hostel.owner } },
      { upsert: true }
    );

    return sendSuccess(res, undefined, { message: "Call click tracked" });
  } catch (error) {
    return sendError(res, 500, "CALL_TRACK_FAILED", "Failed to track call click");
  }
};

export const getOwnerDashboardAnalyticsController = async (req, res) => {
  try {
    const data = await getOwnerDashboardAnalytics({
      ownerId: req.userId,
      from: req.query.from,
      to: req.query.to,
    });
    return sendSuccess(res, data);
  } catch (_error) {
    return sendError(
      res,
      500,
      "OWNER_DASHBOARD_ANALYTICS_FETCH_FAILED",
      "Failed to fetch owner dashboard analytics"
    );
  }
};
