import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true, trim: true },
    floorNumber: { type: Number, required: true, min: 0 },
    bedCount: { type: Number, required: true, min: 1 },
    occupiedBeds: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator(value) {
          return value <= this.bedCount;
        },
        message: "Occupied beds cannot be greater than total beds.",
      },
    },
    hasAC: { type: Boolean, default: false },
    hasAttachedBath: { type: Boolean, default: false },
    rentPerBed: { type: Number, required: true, min: 0 },
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
    isActive: { type: Boolean, default: true },
    rooms: [roomSchema],
  },
  { timestamps: true }
);

hostelSchema.index({ owner: 1, name: 1 }, { unique: true });

export const Hostel = mongoose.model("Hostel", hostelSchema);
