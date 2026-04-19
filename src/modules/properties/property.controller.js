import { Property } from "./properties.model.js";
import { getPagination } from "../../config/pagination.js";
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
      return res.status(400).json({
        message: "Attached bathrooms cannot exceed total bathrooms.",
      });
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

    res.status(201).json({
      success: true,
      message: "Property listed successfully",
      data: savedProperty,
    });
  } catch (error) {
    console.error("Property Creation Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.userId });
    res.status(200).json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};