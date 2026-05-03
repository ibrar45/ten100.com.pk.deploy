import { Schema, model } from 'mongoose';

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ["user", "owner", "hostel_owner", "tenant", "landlord"],
  },
  description: {
    type: String,
  }
}, { timestamps: true });

export const Role = model('Role', roleSchema);