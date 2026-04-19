import User from "../auth/user.model.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, address } = req.body;

    // Use Dot Notation for atomic updates of nested objects
    const updateData = {};
    if (firstName) updateData["profile.firstName"] = firstName;
    if (lastName) updateData["profile.lastName"] = lastName;
    if (phoneNumber) updateData["profile.phoneNumber"] = phoneNumber;
    
    if (address) {
      if (address.street) updateData["address.street"] = address.street;
      if (address.city) updateData["address.city"] = address.city;
      if (address.state) updateData["address.state"] = address.state;
      if (address.zipCode) updateData["address.zipCode"] = address.zipCode;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};