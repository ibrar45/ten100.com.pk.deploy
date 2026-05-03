import mongoose from "mongoose";
import dns from "node:dns";
import { logger } from "./logger.js";

export async function connectDB(mongoUri) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10,
    });
    logger.info("mongodb_connected");
  } catch (error) {
    logger.error("mongodb_connection_failed", {
      name: error?.name,
      message: error?.message,
    });
    process.exit(1);
  }
}