import { Hostel } from "./hostel.model.js";

export const createHostel = async (req, res) => {
  try {
    const { name, code, genderPolicy, totalFloors, contact, address, amenities, rules } =
      req.body;

    const hostel = await Hostel.create({
      owner: req.userId,
      name,
      code,
      genderPolicy,
      totalFloors:
        totalFloors === undefined || totalFloors === null || totalFloors === ""
          ? 0
          : Number(totalFloors),
      contact,
      address,
      amenities: Array.isArray(amenities) ? amenities : [],
      rules: Array.isArray(rules) ? rules : [],
      rooms: [],
    });

    return res.status(201).json({
      success: true,
      message: "Hostel created successfully",
      data: hostel,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Hostel with same name/code already exists",
      });
    }
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const addRoomToHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const {
      roomNo,
      floorNumber,
      bedCount,
      occupiedBeds,
      hasAC,
      hasAttachedBath,
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
      return res.status(404).json({
        success: false,
        message: "Hostel not found or you are not allowed",
      });
    }

    const duplicateRoom = hostel.rooms.find(
      (room) =>
        room.roomNo?.toLowerCase() === String(roomNo).toLowerCase() &&
        Number(room.floorNumber) === Number(floorNumber)
    );

    if (duplicateRoom) {
      return res.status(409).json({
        success: false,
        message: "Room already exists on this floor",
      });
    }

    const nextOccupiedBeds =
      occupiedBeds === undefined || occupiedBeds === null || occupiedBeds === ""
        ? 0
        : Number(occupiedBeds);

    if (nextOccupiedBeds > Number(bedCount)) {
      return res.status(400).json({
        success: false,
        message: "Occupied beds cannot exceed total beds",
      });
    }

    hostel.rooms.push({
      roomNo,
      floorNumber: Number(floorNumber),
      bedCount: Number(bedCount),
      occupiedBeds: nextOccupiedBeds,
      hasAC: Boolean(hasAC),
      hasAttachedBath: Boolean(hasAttachedBath),
      rentPerBed: Number(rentPerBed),
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
    });

    await hostel.save();

    return res.status(201).json({
      success: true,
      message: "Room added successfully",
      data: hostel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMyHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ owner: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find()
      .populate("owner", "username email role")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getHostelById = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await Hostel.findOne({ _id: hostelId, owner: req.userId }).populate(
      "owner",
      "username email role"
    );

    if (!hostel) {
      return res.status(404).json({ success: false, message: "Hostel not found" });
    }

    return res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
