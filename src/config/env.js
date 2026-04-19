function required(name, minLen = 1) {
  const v = process.env[name]?.trim();
  if (!v || v.length < minLen) {
    throw new Error(`Missing or invalid env: ${name}`);
  }
  return v;
}

/** Call after dotenv.config() */
export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";

  const JWT_SECRET = required("JWT_SECRET", isProd ? 32 : 8);
  const MONGO_URI = required("MONGO_URI");

  const PORT = Number(process.env.PORT) || 5000;

  const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";

  return {
    nodeEnv,
    isProd,
    JWT_SECRET,
    MONGO_URI,
    PORT,
    CORS_ORIGINS,
    TRUST_PROXY,
  };
}