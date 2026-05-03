import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeExt(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  return ext || ".jpg";
}

function createStorage(subdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_ROOT, subdir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${stamp}${safeExt(file.originalname)}`);
    },
  });
}

function imageFilter(_req, file, cb) {
  if (file.mimetype?.startsWith("image/")) return cb(null, true);
  return cb(new Error("Only image files are allowed"));
}

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB per file

const hostelUpload = multer({
  storage: createStorage("hostels"),
  fileFilter: imageFilter,
  limits,
});

const roomUpload = multer({
  storage: createStorage("rooms"),
  fileFilter: imageFilter,
  limits,
});

export const uploadHostelImages = hostelUpload.array("images", 10);
export const uploadRoomImages = roomUpload.array("images", 10);

function setByPath(target, rawPath, value) {
  const normalized = rawPath
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  if (normalized.length === 0) {
    target[rawPath] = value;
    return;
  }
  let cursor = target;
  for (let i = 0; i < normalized.length - 1; i += 1) {
    const key = normalized[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[normalized[normalized.length - 1]] = value;
}

/** Converts multipart flat keys like address.city or address[city] into nested objects. */
export function normalizeMultipartBody(req, _res, next) {
  if (!req.is("multipart/form-data") || !req.body || typeof req.body !== "object") {
    return next();
  }
  const normalized = {};
  for (const [key, value] of Object.entries(req.body)) {
    setByPath(normalized, key, value);
  }
  req.body = normalized;
  return next();
}
