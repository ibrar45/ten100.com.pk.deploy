import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { loadEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { attachHostelChat } from "./socket/hostelChat.socket.js";

const env = loadEnv();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

await connectDB(env.MONGO_URI);

const server = http.createServer(app);

const socketCorsOrigin =
  env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : !env.isProd ? true : false;

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    credentials: true,
  },
});
attachHostelChat(io);

server.listen(env.PORT, () => {
  logger.info("server_listening", { port: env.PORT, nodeEnv: env.nodeEnv });
});

function shutdown(signal) {
  logger.warn("shutdown", { signal });
  io.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));