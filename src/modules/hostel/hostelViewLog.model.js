import mongoose from "mongoose";

const hostelViewLogSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true }
);

hostelViewLogSchema.index({ owner: 1, createdAt: -1 });
hostelViewLogSchema.index({ hostel: 1, createdAt: -1 });

export const HostelViewLog = mongoose.model("HostelViewLog", hostelViewLogSchema);
