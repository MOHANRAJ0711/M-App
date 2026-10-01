import fs from "node:fs";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { serializeRecording } from "../utils/serialize";
import { storage } from "../storage/local-file-storage";

async function meetingForUser(userId: string, meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });
  if (!meeting) throw new HttpError(404, "Meeting not found.");
  const participant = meeting.participants.find((item) => item.userId === userId);
  if (!participant) throw new HttpError(403, "You do not have access to this meeting.");
  return { meeting, participant };
}

export async function saveRecordingUpload(input: {
  userId: string;
  meetingId: string;
  sourcePath: string;
  mimeType: string;
  duration: number;
  startedAt: Date;
  endedAt: Date;
}) {
  const { meeting, participant } = await meetingForUser(input.userId, input.meetingId);
  if (participant.role !== "HOST") {
    throw new HttpError(403, "Only the host can save a recording.");
  }

  let saved: { fileName: string; relativePath: string; fileSize: number } | null = null;
  try {
    saved = await storage.save(meeting.meetingCode, input.sourcePath);
    if (saved.fileSize === 0) {
      await storage.remove(saved.relativePath);
      throw new HttpError(400, "The recording file was empty.");
    }
    const recording = await prisma.recording.create({
      data: {
        meetingId: meeting.id,
        fileName: saved.fileName,
        filePath: saved.relativePath,
        fileSize: saved.fileSize,
        duration: input.duration,
        mimeType: "video/webm",
        startedAt: input.startedAt,
        endedAt: input.endedAt,
      },
      include: { meeting: { select: { id: true, title: true, meetingCode: true } } },
    });
    return serializeRecording(recording);
  } catch (error) {
    if (saved) await storage.remove(saved.relativePath).catch(() => undefined);
    throw error;
  }
}

export async function listRecordings(
  userId: string,
  query: {
    search?: string;
    meetingId?: string;
    from?: string;
    to?: string;
    sort?: string;
    cursor?: string;
  },
) {
  const limit = 20;
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw new HttpError(400, "Enter a valid date.");
  }

  const recordings = await prisma.recording.findMany({
    where: {
      meeting: {
        participants: { some: { userId } },
        ...(query.meetingId ? { id: query.meetingId } : {}),
        ...(query.search ? { title: { contains: query.search } } : {}),
      },
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { meeting: { select: { id: true, title: true, meetingCode: true } } },
    orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const page = recordings.slice(0, limit);
  return {
    recordings: page.map(serializeRecording),
    nextCursor: recordings.length > limit ? page[page.length - 1]?.id ?? null : null,
  };
}

async function accessibleRecording(userId: string, recordingId: string) {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          meetingCode: true,
          hostId: true,
          participants: { select: { userId: true, role: true } },
        },
      },
    },
  });
  if (!recording) throw new HttpError(404, "Recording not found.");
  const participant = recording.meeting.participants.find((item) => item.userId === userId);
  if (!participant) throw new HttpError(403, "You do not have access to this recording.");
  return { recording, participant };
}

export async function getRecording(userId: string, recordingId: string) {
  const { recording } = await accessibleRecording(userId, recordingId);
  const absolutePath = storage.resolve(recording.filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new HttpError(404, "Recording file is missing.");
  }
  return { recording: serializeRecording(recording), absolutePath, mimeType: recording.mimeType, fileName: recording.fileName, fileSize: recording.fileSize };
}

export async function deleteRecording(userId: string, recordingId: string) {
  const { recording, participant } = await accessibleRecording(userId, recordingId);
  if (participant.role !== "HOST" && recording.meeting.hostId !== userId) {
    throw new HttpError(403, "Only the host can delete a recording.");
  }
  await storage.remove(recording.filePath);
  await prisma.recording.delete({ where: { id: recording.id } });
  return { ok: true };
}
