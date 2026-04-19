import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
  tenantMessage: { type: String, trim: true },
  landlordNote: { type: String, trim: true },
  availabilityDate: { type: Date }
}, { timestamps: true });

// Prevent duplicate pending requests for the same property by the same tenant
requestSchema.index({ property: 1, tenant: 1 }, { unique: true });

export const Request = mongoose.model("Request", requestSchema);