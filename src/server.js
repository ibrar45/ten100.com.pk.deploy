import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { loadEnv } from "./config/env.js";
import { logger } from "./config/logger.js";

const env = loadEnv();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

await connectDB(env.MONGO_URI);

const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info("server_listening", { port: env.PORT, nodeEnv: env.nodeEnv });
});

function shutdown(signal) {
  logger.warn("shutdown", { signal });
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));