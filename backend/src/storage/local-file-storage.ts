import fs from "node:fs";
import path from "node:path";
import { MEETING_CODE_PATTERN } from "../utils/meeting-code";
import { HttpError } from "../utils/http-error";

export interface StorageService {
  save(
    meetingCode: string,
    sourcePath: string,
  ): Promise<{ fileName: string; relativePath: string; fileSize: number }>;
  resolve(relativePath: string): string;
  remove(relativePath: string): Promise<void>;
}

export function recordingsRoot() {
  return path.resolve(process.cwd(), process.env.RECORDINGS_PATH || "recordings");
}

export function assertInsideRecordings(relativePath: string) {
  const root = recordingsRoot();
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new HttpError(400, "Invalid recording path.");
  }
  return resolved;
}

export class LocalFileStorage implements StorageService {
  async save(meetingCode: string, sourcePath: string) {
    if (!MEETING_CODE_PATTERN.test(meetingCode)) {
      throw new HttpError(400, "Invalid meeting code.");
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `recording-${stamp}.webm`;
    const relativePath = path.posix.join(`meeting-${meetingCode}`, fileName);
    const absolutePath = assertInsideRecordings(relativePath);
    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.promises.rename(sourcePath, absolutePath);
    const stat = await fs.promises.stat(absolutePath);
    return { fileName, relativePath, fileSize: stat.size };
  }

  resolve(relativePath: string) {
    return assertInsideRecordings(relativePath);
  }

  async remove(relativePath: string) {
    const absolutePath = assertInsideRecordings(relativePath);
    await fs.promises.rm(absolutePath, { force: true });
  }
}

export const storage: StorageService = new LocalFileStorage();
