import type { Meeting, ParticipantRole } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { generateMeetingCode, MEETING_CODE_PATTERN } from "../utils/meeting-code";
import { serializeMeeting } from "../utils/serialize";

export const MAX_PARTICIPANTS = 5;

async function uniqueMeetingCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const meetingCode = generateMeetingCode();
    const existing = await prisma.meeting.findUnique({ where: { meetingCode } });
    if (!existing) return meetingCode;
  }
  throw new HttpError(500, "Could not generate a meeting code.");
}

export async function createMeeting(hostId: string, title: string) {
  const meetingCode = await uniqueMeetingCode();
  const meeting = await prisma.meeting.create({
    data: {
      meetingCode,
      title: title.trim(),
      hostId,
      status: "SCHEDULED",
      participants: {
        create: {
          userId: hostId,
          role: "HOST",
        },
      },
    },
  });

  return {
    meetingId: meeting.id,
    meetingCode: meeting.meetingCode,
    meeting: serializeMeeting(meeting, "HOST"),
  };
}

async function getMeetingByCode(meetingCode: string) {
  if (!MEETING_CODE_PATTERN.test(meetingCode)) {
    throw new HttpError(400, "Enter a valid meeting ID.");
  }
  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });
  if (!meeting) {
    throw new HttpError(404, "Meeting not found.");
  }
  return meeting;
}

function assertJoinable(meeting: Meeting) {
  if (meeting.status === "CANCELLED") {
    throw new HttpError(400, "This meeting was cancelled.");
  }
  if (meeting.status === "COMPLETED") {
    throw new HttpError(400, "This meeting has ended.");
  }
}

export async function assertParticipant(userId: string, meetingId: string) {
  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId, userId } },
  });
  if (!participant) {
    throw new HttpError(403, "You do not have access to this meeting.");
  }
  return participant;
}

export async function assertHost(userId: string, meetingId: string) {
  const participant = await assertParticipant(userId, meetingId);
  if (participant.role !== "HOST") {
    throw new HttpError(403, "Only the host can do that.");
  }
  return participant;
}

async function participantViews(meetingId: string) {
  const rows = await prisma.meetingParticipant.findMany({
    where: { meetingId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    role: row.role,
    joinedAt: row.joinedAt,
    leftAt: row.leftAt,
  }));
}

export async function previewMeeting(meetingCode: string) {
  const meeting = await getMeetingByCode(meetingCode);
  assertJoinable(meeting);
  return serializeMeeting(meeting, null);
}

export async function joinMeeting(userId: string, meetingCode: string) {
  const meeting = await getMeetingByCode(meetingCode);
  assertJoinable(meeting);

  const existing = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
  });
  const alreadyActive = Boolean(existing && !existing.leftAt);
  const activeCount = await prisma.meetingParticipant.count({
    where: { meetingId: meeting.id, leftAt: null },
  });

  if (!alreadyActive && activeCount >= MAX_PARTICIPANTS) {
    throw new HttpError(403, "This meeting is full (5 participants).");
  }

  const role: ParticipantRole = meeting.hostId === userId ? "HOST" : "PARTICIPANT";
  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
    create: { meetingId: meeting.id, userId, role },
    update: { leftAt: null, joinedAt: new Date(), role },
  });

  let current = meeting;
  if (role === "HOST" && meeting.status === "SCHEDULED") {
    current = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  return {
    meeting: serializeMeeting(current, role),
    participants: await participantViews(meeting.id),
    role,
  };
}

export async function startMeeting(userId: string, meetingCode: string) {
  const meeting = await getMeetingByCode(meetingCode);
  await assertHost(userId, meeting.id);
  if (meeting.status === "CANCELLED" || meeting.status === "COMPLETED") {
    throw new HttpError(400, "This meeting cannot be started.");
  }
  if (meeting.status === "LIVE") {
    return serializeMeeting(meeting, "HOST");
  }
  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "LIVE", startedAt: meeting.startedAt ?? new Date() },
  });
  return serializeMeeting(updated, "HOST");
}

export async function leaveMeeting(userId: string, meetingCode: string) {
  const meeting = await getMeetingByCode(meetingCode);
  await assertParticipant(userId, meeting.id);
  await prisma.meetingParticipant.update({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
    data: { leftAt: new Date() },
  });
  return { ok: true };
}

export async function endMeeting(userId: string, meetingCode: string) {
  const meeting = await getMeetingByCode(meetingCode);
  await assertHost(userId, meeting.id);
  if (meeting.status === "COMPLETED" || meeting.status === "CANCELLED") {
    throw new HttpError(400, "This meeting has already ended.");
  }

  const endedAt = new Date();
  const started = meeting.startedAt ?? meeting.createdAt;
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - started.getTime()) / 1000));
  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: "COMPLETED",
      endedAt,
      startedAt: meeting.startedAt ?? started,
      durationSeconds,
    },
  });
  await prisma.meetingParticipant.updateMany({
    where: { meetingId: meeting.id, leftAt: null },
    data: { leftAt: endedAt },
  });
  return serializeMeeting(updated, "HOST");
}

export async function listMeetings(userId: string) {
  const rows = await prisma.meetingParticipant.findMany({
    where: { userId },
    include: { meeting: true },
    orderBy: { meeting: { createdAt: "desc" } },
  });

  const upcoming = [];
  const recent = [];
  for (const row of rows) {
    const item = serializeMeeting(row.meeting, row.role);
    if (row.meeting.status === "SCHEDULED") upcoming.push(item);
    if (row.meeting.status === "LIVE" || row.meeting.status === "COMPLETED") recent.push(item);
  }

  return { upcoming, recent };
}

export async function getMeetingForSocket(meetingCode: string, userId: string) {
  const meeting = await getMeetingByCode(meetingCode);
  assertJoinable(meeting);
  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
  });
  if (!participant || participant.leftAt) {
    throw new HttpError(403, "Join the meeting before connecting.");
  }
  return { meeting, participant };
}
