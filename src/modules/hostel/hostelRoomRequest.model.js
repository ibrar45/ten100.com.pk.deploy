import mongoose from "mongoose";

const hostelRoomRequestSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    tenantMessage: { type: String, trim: true, maxlength: 2000 },
    ownerNote: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

hostelRoomRequestSchema.index(
  { hostel: 1, room: 1, tenant: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
hostelRoomRequestSchema.index({ owner: 1, createdAt: -1 });
hostelRoomRequestSchema.index({ owner: 1, status: 1, createdAt: -1 });

export const HostelRoomRequest = mongoose.model("HostelRoomRequest", hostelRoomRequestSchema);
