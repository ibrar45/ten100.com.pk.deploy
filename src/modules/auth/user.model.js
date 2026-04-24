import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["tenant", "landlord", "hostel_owner"],
      required: true,
    },
    profile: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      phoneNumber: { type: String, trim: true },
      gender: {
        type: String,
        enum: ["male", "female", "non_binary", "other", "prefer_not_to_say"],
        trim: true,
      },
      dateOfBirth: { type: Date },
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);