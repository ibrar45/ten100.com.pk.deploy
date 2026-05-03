import User from "../auth/user.model.js";
import { generateToken } from "../../utils/generateToken.js";
import { sendError, sendSuccess } from "../../utils/http.js";

const isProd = process.env.NODE_ENV === "production";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, isDeleted: false }).select("-password");
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, 500, "USER_PROFILE_FETCH_FAILED", "Failed to fetch profile");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, gender, dateOfBirth, address } =
      req.body;

    // Use Dot Notation for atomic updates of nested objects
    const updateData = {};
    if (firstName) updateData["profile.firstName"] = firstName;
    if (lastName) updateData["profile.lastName"] = lastName;
    if (phoneNumber) updateData["profile.phoneNumber"] = phoneNumber;
    if (gender) updateData["profile.gender"] = gender;
    if (dateOfBirth) updateData["profile.dateOfBirth"] = new Date(dateOfBirth);
    
    if (address) {
      if (address.street) updateData["address.street"] = address.street;
      if (address.city) updateData["address.city"] = address.city;
      if (address.state) updateData["address.state"] = address.state;
      if (address.zipCode) updateData["address.zipCode"] = address.zipCode;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.userId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, updatedUser, { message: "Profile updated successfully" });
  } catch (error) {
    return sendError(res, 500, "USER_PROFILE_UPDATE_FAILED", "Failed to update profile");
  }
};

export const becomeHostelOwner = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, isDeleted: false });
    if (!user) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }
    if (user.role !== "user") {
      return sendError(
        res,
        403,
        "USER_ROLE_TRANSITION_NOT_ALLOWED",
        'Only the default "user" role can complete this onboarding step'
      );
    }

    const { firstName, lastName, phoneNumber, gender, dateOfBirth, address } = req.body;

    user.role = "owner";
    user.profile = user.profile || {};
    user.profile.firstName = firstName;
    user.profile.lastName = lastName;
    user.profile.phoneNumber = phoneNumber;
    user.profile.gender = gender;
    user.profile.dateOfBirth = new Date(dateOfBirth);
    user.address = user.address || {};
    user.address.street = address.street;
    user.address.city = address.city;
    if (address.state) user.address.state = address.state;
    if (address.zipCode) user.address.zipCode = address.zipCode;

    await user.save();

    generateToken(res, user._id, user.role, { isProd });

    const fresh = await User.findOne({ _id: user._id, isDeleted: false }).select("-password");
    return sendSuccess(res, fresh, { message: "Profile completed; you are now an owner" });
  } catch (error) {
    return sendError(res, 500, "USER_BECOME_OWNER_FAILED", "Failed to become owner");
  }
};