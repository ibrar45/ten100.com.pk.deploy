import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ["Home", "Apartment"],
      required: true,
    },
    /** Optional for v1 if you only care city/area; validation can require it per category */
    sizeMarla: { type: Number },
    type: {
      type: String,
      enum: ["Full", "Partial"],
      required: true,
    },
    portionDetails: { type: String, trim: true },
    /** Unit / portion floor: number or string e.g. "Ground", "3" */
    floor: { type: mongoose.Schema.Types.Mixed },
    rooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    attachedBaths: { type: Number, default: 0 },
    address: {
      city: { type: String, trim: true },
      area: { type: String, trim: true },
      street: { type: String, trim: true },
      fullAddress: { type: String, trim: true },
    },
    price: { type: Number, required: true },
    amenities: [String],
    images: [String],
  },
  { timestamps: true }
);

export const Property = mongoose.model("Property", propertySchema);