import mongoose from "mongoose";

const hostelChatMessageSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

hostelChatMessageSchema.index({ hostel: 1, createdAt: -1 });
hostelChatMessageSchema.index({ hostel: 1, from: 1, to: 1, createdAt: -1 });
hostelChatMessageSchema.index({ hostel: 1, to: 1, createdAt: -1 });

export const HostelChatMessage = mongoose.model("HostelChatMessage", hostelChatMessageSchema);
