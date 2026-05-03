import mongoose from "mongoose";
import { Hostel } from "./hostel.model.js";
import { HostelCallLog } from "./hostelCallLog.model.js";
import { HostelRoomRequest } from "./hostelRoomRequest.model.js";
import { HostelViewLog } from "./hostelViewLog.model.js";
import { HostelChatMessage } from "../chat/hostelChat.model.js";

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function buildRanges(fromRaw, toRaw) {
  const toParsed = parseDateInput(toRaw);
  const fromParsed = parseDateInput(fromRaw);

  let thisStart;
  let thisEnd;

  if (fromParsed && toParsed && fromParsed < toParsed) {
    thisStart = fromParsed;
    thisEnd = toParsed;
  } else {
    thisEnd = new Date();
    thisStart = new Date(thisEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const durationMs = thisEnd.getTime() - thisStart.getTime();
  const lastEnd = new Date(thisStart);
  const lastStart = new Date(thisStart.getTime() - durationMs);

  return {
    thisRange: { $gte: thisStart, $lt: thisEnd },
    lastRange: { $gte: lastStart, $lt: lastEnd },
  };
}

export async function getOwnerDashboardAnalytics({ ownerId, from, to }) {
  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const { thisRange, lastRange } = buildRanges(from, to);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const ownedHostels = await Hostel.find({ owner: ownerObjectId }).select("_id").lean();
  const hostelIds = ownedHostels.map((h) => h._id);

  const [
    listingAgg,
    callAgg,
    requestAgg,
    callsThisWeek,
    callsLastWeek,
    requestsThisWeek,
    requestsLastWeek,
    viewsThisWeek,
    viewsLastWeek,
    chatAgg,
  ] = await Promise.all([
    Hostel.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: {
              $cond: [{ $eq: ["$listingStatus", "draft"] }, 1, 0],
            },
          },
          published: {
            $sum: {
              $cond: [{ $eq: ["$listingStatus", "published"] }, 1, 0],
            },
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ["$isActive", false] }, 1, 0],
            },
          },
        },
      },
    ]),
    HostelCallLog.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          users: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCalls: 1,
          uniqueUsersCount: { $size: "$users" },
        },
      },
    ]),
    HostelRoomRequest.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $facet: {
          total: [{ $count: "value" }],
          pending: [{ $match: { status: "pending" } }, { $count: "value" }],
          responded: [
            { $match: { status: { $in: ["accepted", "rejected"] } } },
            { $count: "value" },
          ],
          today: [
            { $match: { createdAt: { $gte: todayStart, $lt: tomorrowStart } } },
            { $count: "value" },
          ],
        },
      },
    ]),
    HostelCallLog.countDocuments({ owner: ownerObjectId, createdAt: thisRange }),
    HostelCallLog.countDocuments({ owner: ownerObjectId, createdAt: lastRange }),
    HostelRoomRequest.countDocuments({ owner: ownerObjectId, createdAt: thisRange }),
    HostelRoomRequest.countDocuments({ owner: ownerObjectId, createdAt: lastRange }),
    HostelViewLog.countDocuments({ owner: ownerObjectId, createdAt: thisRange }),
    HostelViewLog.countDocuments({ owner: ownerObjectId, createdAt: lastRange }),
    HostelChatMessage.aggregate([
      { $match: { hostel: { $in: hostelIds } } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          activeHostels: { $addToSet: "$hostel" },
        },
      },
      {
        $project: {
          _id: 0,
          totalMessages: 1,
          activeChats: { $size: "$activeHostels" },
        },
      },
    ]),
  ]);

  const listing = listingAgg[0] || { total: 0, draft: 0, published: 0, inactive: 0 };
  const call = callAgg[0] || { uniqueUsersCount: 0, totalCalls: 0 };
  const reqFacet = requestAgg[0] || {};
  const chat = chatAgg[0] || { totalMessages: 0, activeChats: 0 };

  const pick = (arr) => (Array.isArray(arr) && arr[0] ? arr[0].value : 0);

  return {
    callAnalytics: {
      uniqueUsersCount: call.uniqueUsersCount || 0,
      totalCalls: call.totalCalls || 0,
    },
    listingAnalytics: {
      totalListings: listing.total || 0,
      draftListings: listing.draft || 0,
      publishedListings: listing.published || 0,
      inactiveListings: listing.inactive || 0,
    },
    requestAnalytics: {
      totalRequests: pick(reqFacet.total),
      pendingRequests: pick(reqFacet.pending),
      respondedRequests: pick(reqFacet.responded),
      todayRequests: pick(reqFacet.today),
    },
    weeklyGrowth: {
      viewsThisWeek,
      viewsLastWeek,
      requestsThisWeek,
      requestsLastWeek,
      callsThisWeek,
      callsLastWeek,
    },
    chatActivity: {
      totalMessages: chat.totalMessages || 0,
      activeChats: chat.activeChats || 0,
    },
  };
}
