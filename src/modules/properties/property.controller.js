import { Property } from "./properties.model.js";
import { getPagination } from "../../config/pagination.js";
import { logger } from "../../config/logger.js";
import { sendError, sendSuccess } from "../../utils/http.js";
function buildDefaultTitle(body) {
  const cat = body.category || "Listing";
  const area = body.location?.area || "";
  const city = body.location?.city || "";
  const rooms = body.totalRooms != null ? `${body.totalRooms} BR` : "";
  return [cat, rooms, area, city].filter(Boolean).join(" · ").trim() || "Rental listing";
}

export const createProperty = async (req, res) => {
  try {
    const {
      title: rawTitle,
      description,
      category,
      sizeInMarla,
      structureType,
      portionDetails,
      floor,
      totalRooms,
      bathrooms,
      attachedBaths,
      price,
      location,
    } = req.body;

    if (Number(attachedBaths) > Number(bathrooms)) {
      return sendError(
        res,
        400,
        "PROPERTY_INVALID_BATHROOM_COUNTS",
        "Attached bathrooms cannot exceed total bathrooms."
      );
    }

    const title =
      String(rawTitle || "").trim().length >= 3
        ? String(rawTitle).trim()
        : buildDefaultTitle(req.body);

    const newProperty = new Property({
      landlord: req.userId,
      title,
      description,
      category,
      sizeMarla:
        sizeInMarla === undefined || sizeInMarla === "" || sizeInMarla === null
          ? undefined
          : Number(sizeInMarla),
      type: structureType,
      floor: floor === "" || floor === undefined ? undefined : floor,
      portionDetails:
        structureType === "Partial" ? portionDetails : "Full Unit",
      rooms: Number(totalRooms),
      bathrooms: Number(bathrooms),
      attachedBaths: Number(attachedBaths),
      price: Number(price),
      address: {
        city: location?.city,
        area: location?.area,
        street: location?.street,
        fullAddress: location?.fullAddress,
      },
    });

    const savedProperty = await newProperty.save();

    return sendSuccess(res, savedProperty, { status: 201, message: "Property listed successfully" });
  } catch (error) {
    logger.error("property_create_failed", {
      message: error?.message,
      code: error?.code,
    });
    return sendError(res, 500, "PROPERTY_CREATE_FAILED", "Failed to create property");
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.userId });
    return sendSuccess(res, properties);
  } catch (error) {
    return sendError(res, 500, "PROPERTY_FETCH_MINE_FAILED", "Failed to fetch your properties");
  }
};

export const getAllProperties = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [items, total] = await Promise.all([
      Property.find()
        .populate("landlord", "username email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(),
    ]);
    return sendSuccess(res, items, {
      meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return sendError(res, 500, "PROPERTY_FETCH_ALL_FAILED", "Failed to fetch properties");
  }
};