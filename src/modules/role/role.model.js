import { Schema, model } from 'mongoose';

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['tenant', 'landlord', 'hostel_owner'], // Strict validation
  },
  description: {
    type: String,
  }
}, { timestamps: true });

export const Role = model('Role', roleSchema);