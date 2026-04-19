import jwt from "jsonwebtoken";

export function generateToken(res, userId, role, { isProd } = {}) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not set");

  const token = jwt.sign({ id: userId, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: Boolean(isProd),
    sameSite: isProd ? "lax" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}