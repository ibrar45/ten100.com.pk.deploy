import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true, trim: true },
    floorNumber: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return value <= this.totalSeats;
        },
        message: "Available seats cannot be greater than total seats.",
      },
    },
    attachedBath: { type: Boolean, default: false },
    acAvailable: { type: Boolean, default: false },
    geyserAvailable: { type: Boolean, default: false },
    /** Number of people sharing this room (e.g. 3 means 3-sharing). */
    sharingType: { type: Number, min: 1 },
    rentPerBed: { type: Number, required: true, min: 0 },
    rentPerBedPerDay: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          const hostel = typeof this.ownerDocument === "function" ? this.ownerDocument() : null;
          const isShortStay = Boolean(hostel?.isShortStayAvailable);
          if (!isShortStay) return true;
          return Number(value) > 0;
        },
        message: "rentPerBedPerDay is required when short stay is enabled",
      },
    },
    securityDeposit: { type: Number, min: 0, default: 0 },
    roomType: {
      type: String,
      enum: ["single", "double", "triple", "dormitory", "custom"],
      default: "custom",
    },
    furnishing: {
      type: String,
      enum: ["furnished", "semi_furnished", "unfurnished"],
      default: "unfurnished",
    },
    hasBalcony: { type: Boolean, default: false },
    hasWifi: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["available", "partially_occupied", "full", "maintenance"],
      default: "available",
    },
    notes: { type: String, trim: true },
    images: [{ type: String, trim: true }],
  },
  { _id: true, timestamps: true }
);

const hostelSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    genderPolicy: {
      type: String,
      enum: ["boys", "girls", "co_live"],
      default: "co_live",
    },
    totalFloors: { type: Number, min: 0, default: 0 },
    contact: {
      phone: { type: String, trim: true },
      alternatePhone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    address: {
      city: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
      street: { type: String, trim: true },
      fullAddress: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    amenities: [{ type: String, trim: true }],
    rules: [{ type: String, trim: true }],
    images: [{ type: String, trim: true }],
    isShortStayAvailable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    /** New hostels start as draft; publish after rooms are added. Legacy docs without this field are treated as published in queries. */
    listingStatus: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    totalRoomCount: { type: Number, default: 0, min: 0 },
    totalAvailableSeats: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    rooms: [roomSchema],
  },
  { timestamps: true }
);

hostelSchema.index({ owner: 1, name: 1 }, { unique: true });

hostelSchema.pre("save", function computeHostelStats() {
  const rooms = Array.isArray(this.rooms) ? this.rooms : [];
  this.totalRoomCount = rooms.length;
  this.totalAvailableSeats = rooms.reduce(
    (sum, room) => sum + (Number(room.availableSeats) || 0),
    0
  );
});

export const Hostel = mongoose.model("Hostel", hostelSchema);
