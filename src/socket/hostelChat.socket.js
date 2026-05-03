import jwt from "jsonwebtoken";
import User from "../modules/auth/user.model.js";
import { Hostel } from "../modules/hostel/hostel.model.js";
import { HostelChatMessage } from "../modules/chat/hostelChat.model.js";

function readTokenFromCookie(header) {
  if (!header || typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === "token") return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function roomIdForHostelChat(hostelId, userA, userB) {
  return `hostelChat:${hostelId}:${[String(userA), String(userB)].sort().join(":")}`;
}

export function attachHostelChat(io) {
  io.use(async (socket, next) => {
    try {
      const secret = process.env.JWT_SECRET?.trim();
      if (!secret) return next(new Error("server_misconfig"));

      const headerToken =
        typeof socket.handshake.auth?.token === "string"
          ? socket.handshake.auth.token.trim()
          : null;
      const raw = headerToken || readTokenFromCookie(socket.handshake.headers?.cookie);
      if (!raw) return next(new Error("unauthorized"));

      const decoded = jwt.verify(raw, secret);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      if (!socket.userRole) {
        const u = await User.findById(socket.userId).select("role");
        if (u?.role) socket.userRole = u.role;
      }
      if (!socket.userRole) return next(new Error("unauthorized"));
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_hostel_chat", async ({ hostelId, peerId }, cb) => {
      try {
        if (!hostelId || !peerId) {
          cb?.({ success: false, message: "hostelId and peerId are required" });
          return;
        }
        const hostel = await Hostel.findById(hostelId).select("owner listingStatus isActive");
        if (!hostel) {
          cb?.({ success: false, message: "Hostel not found" });
          return;
        }
        const ownerId = String(hostel.owner);
        const uid = String(socket.userId);
        const peer = String(peerId);
        if (uid === peer) {
          cb?.({ success: false, message: "invalid peer" });
          return;
        }
        if (uid !== ownerId && peer !== ownerId) {
          cb?.({
            success: false,
            message: "chat is only between a guest and the hostel owner",
          });
          return;
        }
        const isOwner = uid === ownerId;
        const isPublished =
          hostel.listingStatus === "published" || hostel.listingStatus == null;
        if (!hostel.isActive || (!isPublished && !isOwner)) {
          cb?.({ success: false, message: "Hostel not found" });
          return;
        }

        const room = roomIdForHostelChat(hostelId, uid, peer);
        await socket.join(room);
        socket.hostelChatRoom = room;
        cb?.({ success: true, room });
      } catch (e) {
        cb?.({ success: false, message: e.message });
      }
    });

    socket.on("send_hostel_chat_message", async ({ hostelId, toUserId, body }, cb) => {
      try {
        const text = String(body ?? "").trim();
        if (!hostelId || !toUserId || !text) {
          cb?.({ success: false, message: "hostelId, toUserId, and body are required" });
          return;
        }
        if (text.length > 4000) {
          cb?.({ success: false, message: "message too long" });
          return;
        }

        const hostel = await Hostel.findById(hostelId).select("owner listingStatus isActive");
        if (!hostel) {
          cb?.({ success: false, message: "Hostel not found" });
          return;
        }
        const ownerId = String(hostel.owner);
        const uid = String(socket.userId);
        const to = String(toUserId);
        if (uid === to) {
          cb?.({ success: false, message: "invalid recipient" });
          return;
        }
        if (uid !== ownerId && to !== ownerId) {
          cb?.({ success: false, message: "not allowed" });
          return;
        }
        const isOwner = uid === ownerId;
        const isPublished =
          hostel.listingStatus === "published" || hostel.listingStatus == null;
        if (!hostel.isActive || (!isPublished && !isOwner)) {
          cb?.({ success: false, message: "Hostel not found" });
          return;
        }

        const doc = await HostelChatMessage.create({
          hostel: hostelId,
          from: uid,
          to: to,
          body: text,
        });

        const room = roomIdForHostelChat(hostelId, uid, to);
        io.to(room).emit("hostel_chat_message", {
          _id: doc._id,
          hostel: doc.hostel,
          from: doc.from,
          to: doc.to,
          body: doc.body,
          createdAt: doc.createdAt,
        });
        cb?.({ success: true, data: doc });
      } catch (e) {
        cb?.({ success: false, message: e.message });
      }
    });
  });
}
