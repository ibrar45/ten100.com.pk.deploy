import mongoose from "mongoose";
import { Hostel } from "./hostel.model.js";
import { HostelChatMessage } from "../chat/hostelChat.model.js";
import { sendError, sendSuccess } from "../../utils/http.js";
import { logger } from "../../config/logger.js";

function isMongoObjectIdString(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

/** Both users must be the hostel owner and the other party (tenant / user). */
function assertHostelChatParticipants(hostel, userId, peerId) {
  const ownerId = String(hostel.owner);
  const a = String(userId);
  const b = String(peerId);
  if (a === b) return false;
  if (a !== ownerId && b !== ownerId) return false;
  return true;
}

export const getHostelChatHistory = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const peerId = req.query.peerId;
    if (!isMongoObjectIdString(String(peerId || ""))) {
      return sendError(
        res,
        400,
        "CHAT_PEER_ID_REQUIRED",
        "peerId query (Mongo ObjectId) is required"
      );
    }

    const hostel = await Hostel.findById(hostelId).select("owner listingStatus isActive");
    if (!hostel) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }

    const isOwner = String(hostel.owner) === String(req.userId);
    const isPublished = hostel.listingStatus === "published" || hostel.listingStatus == null;
    if (!isOwner && (!isPublished || !hostel.isActive)) {
      return sendError(res, 404, "HOSTEL_NOT_FOUND", "Hostel not found");
    }

    if (!assertHostelChatParticipants(hostel, req.userId, peerId)) {
      return sendError(
        res,
        403,
        "CHAT_PARTICIPANTS_INVALID",
        "You can only load chat with this hostel's owner (or as owner with a guest)"
      );
    }

    const messages = await HostelChatMessage.find({
      hostel: hostelId,
      $or: [
        { from: req.userId, to: peerId },
        { from: peerId, to: req.userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return sendSuccess(res, messages);
  } catch (err) {
    logger.error("chat_history_fetch_failed", { message: err?.message });
    return sendError(res, 500, "CHAT_HISTORY_FETCH_FAILED", "Failed to fetch chat history");
  }
};

function displayNameFromUserDoc(u) {
  if (!u) return "User";
  const fn = u.profile?.firstName;
  const ln = u.profile?.lastName;
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  return combined || u.username || "User";
}

/**
 * Latest thread per (hostel, peer) for a user. `hostelIds` null = any hostel the user participated in.
 */
async function aggregateChatConversations(userId, hostelIds) {
  const userOid = new mongoose.Types.ObjectId(userId);

  const baseMatch =
    hostelIds && hostelIds.length
      ? { hostel: { $in: hostelIds }, $or: [{ from: userOid }, { to: userOid }] }
      : { $or: [{ from: userOid }, { to: userOid }] };

  const rows = await HostelChatMessage.aggregate([
    { $match: baseMatch },
    {
      $addFields: {
        peer: {
          $cond: [{ $eq: ["$from", userOid] }, "$to", "$from"],
        },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { hostel: "$hostel", peer: "$peer" },
        lastBody: { $first: "$body" },
        lastAt: { $first: "$createdAt" },
        lastFrom: { $first: "$from" },
        lastMessageId: { $first: "$_id" },
      },
    },
    { $sort: { lastAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "hostels",
        localField: "_id.hostel",
        foreignField: "_id",
        as: "hostelArr",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.peer",
        foreignField: "_id",
        as: "peerArr",
      },
    },
  ]);

  return rows.map((r) => {
    const hostelDoc = r.hostelArr?.[0];
    const peerDoc = r.peerArr?.[0];
    const hostelIdStr = String(r._id.hostel);
    const peerIdStr = String(r._id.peer);
    const peerDisplay = displayNameFromUserDoc(peerDoc);
    return {
      /** Stable id for React keys */
      id: `${hostelIdStr}:${peerIdStr}`,
      hostelId: hostelIdStr,
      /** Other participant — for owners this is the tenant; for tenants this is the hostel owner */
      peerId: peerIdStr,
      hostelName: hostelDoc?.name || "Hostel",
      peerUsername: peerDoc?.username ?? "",
      peerEmail: peerDoc?.email ?? "",
      peerDisplayName: peerDisplay,
      /** Use for list subtitle / preview */
      preview: r.lastBody ?? "",
      lastMessage: {
        id: String(r.lastMessageId),
        body: r.lastBody,
        createdAt: r.lastAt,
        fromUserId: String(r.lastFrom),
      },
      updatedAt: r.lastAt,
    };
  });
}

/** Owner/hostel_owner: conversations across all owned listings (for Messages inbox). */
export const getOwnerChatConversations = async (req, res) => {
  try {
    const owned = await Hostel.find({ owner: req.userId }).select("_id").lean();
    const hostelIds = owned.map((h) => h._id);
    if (hostelIds.length === 0) {
      return sendSuccess(res, []);
    }

    const data = await aggregateChatConversations(req.userId, hostelIds);
    return sendSuccess(res, data);
  } catch (err) {
    logger.error("chat_conversations_owner_failed", { message: err?.message });
    return sendError(
      res,
      500,
      "CHAT_CONVERSATIONS_OWNER_FAILED",
      "Failed to fetch owner chat conversations"
    );
  }
};

/** Tenant/user: conversations where this account messaged any hostel (peer = owner). */
export const getMyChatConversations = async (req, res) => {
  try {
    const data = await aggregateChatConversations(req.userId, null);
    return sendSuccess(res, data);
  } catch (err) {
    logger.error("chat_conversations_mine_failed", { message: err?.message });
    return sendError(
      res,
      500,
      "CHAT_CONVERSATIONS_MINE_FAILED",
      "Failed to fetch your chat conversations"
    );
  }
};
