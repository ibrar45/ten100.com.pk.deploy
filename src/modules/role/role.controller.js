// controllers/role.controller.js
import { Role } from './role.model.js';

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}, 'name'); // Only return the name field
    res.status(200).json({
      success: true,
      data: roles.map(r => r.name) // Returns ["tenant", "landlord", "hostel_owner"]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed function to run during initial setup
export const seedRoles = async (req, res) => {
  const roles = [
    { name: 'tenant', description: 'Renter of the property' },
    { name: 'landlord', description: 'Individual property owner' },
    { name: 'hostel_owner', description: 'Manager of multi-room hostels' }
  ];

  try {
    await Role.deleteMany(); // Clear existing
    await Role.insertMany(roles);
    res.status(201).json({ success: true, message: "Roles seeded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};