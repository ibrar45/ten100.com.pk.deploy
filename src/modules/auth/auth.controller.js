import User from "./user.model.js";
import bcrypt from "bcryptjs";
import { generateToken, clearAuthCookie } from "../../utils/generateToken.js";
import { sendError, sendSuccess } from "../../utils/http.js";

const isProd = process.env.NODE_ENV === "production";
// REGISTER
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const role = "user";

    const userExists = await User.findOne({
      $or: [{ email }, { username }],
      isDeleted: false,
    });

    if (userExists) {
      return sendError(res, 400, "AUTH_USER_EXISTS", "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    generateToken(res, user._id, user.role, { isProd });

    return sendSuccess(
      res,
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      { status: 201, message: "User registered successfully" }
    );
  } catch (error) {
    return sendError(res, 500, "AUTH_REGISTER_FAILED", "Failed to register user");
  }
};

// LOGIN (email OR username)
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
      isDeleted: false,
    });

    if (!user) {
      return sendError(res, 400, "AUTH_INVALID_CREDENTIALS", "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendError(res, 400, "AUTH_INVALID_CREDENTIALS", "Invalid credentials");
    }

    generateToken(res, user._id, user.role, { isProd });

    return sendSuccess(
      res,
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      { message: "Login successful" }
    );
  } catch (error) {
    return sendError(res, 500, "AUTH_LOGIN_FAILED", "Failed to login");
  }
};

export const logout = async (req, res) => {
  try {
    clearAuthCookie(res, { isProd });
    return sendSuccess(res, undefined, { message: "Logout successful" });
  } catch (error) {
    return sendError(res, 500, "AUTH_LOGOUT_FAILED", "Failed to logout");
  }
};

// GET /me
export const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, isDeleted: false })
      .select("-password")
      .lean();

    if (!user) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, 500, "AUTH_ME_FETCH_FAILED", "Failed to fetch user profile");
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return sendError(res, 400, "AUTH_CURRENT_PASSWORD_INVALID", "Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return sendSuccess(res, undefined, { message: "Password changed successfully" });
  } catch (error) {
    return sendError(res, 500, "AUTH_CHANGE_PASSWORD_FAILED", "Failed to change password");
  }
};

export const softDeleteAccount = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");

    clearAuthCookie(res, { isProd });
    return sendSuccess(res, undefined, { message: "Account soft deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "AUTH_SOFT_DELETE_FAILED", "Failed to soft delete account");
  }
};


