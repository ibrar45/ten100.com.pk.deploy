import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { loadEnv } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { Hostel } from "../src/modules/hostel/hostel.model.js";
import { Bed } from "../src/modules/hostel/bed.model.js";

const env = loadEnv();
await connectDB(env.MONGO_URI);

const hostels = await Hostel.find({}).select("_id owner rooms").lean();
let updatedRooms = 0;

for (const hostel of hostels) {
  for (const room of hostel.rooms || []) {
    const [totalBeds, availableBeds] = await Promise.all([
      Bed.countDocuments({
        hostelId: hostel._id,
        roomId: room._id,
        owner: hostel.owner,
        isActive: true,
      }),
      Bed.countDocuments({
        hostelId: hostel._id,
        roomId: room._id,
        owner: hostel.owner,
        isActive: true,
        isListed: true,
        status: "available",
      }),
    ]);
    await Hostel.updateOne(
      { _id: hostel._id, "rooms._id": room._id },
      {
        $set: {
          "rooms.$.totalSeats": totalBeds,
          "rooms.$.availableSeats": availableBeds,
          "rooms.$.sharingType": totalBeds,
        },
      }
    );
    updatedRooms += 1;
  }
}

console.log(`Migrated ${updatedRooms} rooms`);
await mongoose.connection.close();
