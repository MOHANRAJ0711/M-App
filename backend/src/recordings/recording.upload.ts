import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { recordingsRoot } from "../storage/local-file-storage";

function tempDir() {
  const dir = path.join(recordingsRoot(), ".tmp");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tempDir());
    },
    filename: (_req, _file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}.webm`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const type = file.mimetype.toLowerCase();
    const webmName = file.originalname.toLowerCase().endsWith(".webm");
    const allowed = webmName || type.includes("webm") || type === "application/octet-stream" || type === "video/x-matroska";
    if (!allowed) {
      cb(new Error("Recordings must be WebM files."));
      return;
    }
    cb(null, true);
  },
});
