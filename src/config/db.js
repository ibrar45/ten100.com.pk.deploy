import mongoose from "mongoose";
import dns from "node:dns";

export async function connectDB(mongoUri) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.name, error.message);
    process.exit(1);
  }
}