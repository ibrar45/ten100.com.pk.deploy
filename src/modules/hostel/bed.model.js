import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bedNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["available", "occupied", "blocked"],
      default: "available",
      index: true,
    },
    isListed: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    rentPerBed: { type: Number, required: true, min: 0 },
    rentPerBedPerDay: { type: Number, min: 0 },
  },
  { timestamps: true }
);

bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ hostelId: 1, roomId: 1, status: 1, isListed: 1, isActive: 1 });

export const Bed = mongoose.model("Bed", bedSchema);
