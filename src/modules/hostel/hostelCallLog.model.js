import mongoose from "mongoose";

const hostelCallLogSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

hostelCallLogSchema.index({ hostel: 1, user: 1 }, { unique: true });
hostelCallLogSchema.index({ owner: 1, user: 1 }, { unique: true });
hostelCallLogSchema.index({ owner: 1, createdAt: -1 });

export const HostelCallLog = mongoose.model("HostelCallLog", hostelCallLogSchema);
