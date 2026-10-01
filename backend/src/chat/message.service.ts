import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { assertParticipant } from "../meetings/meeting.service";
import { serializeMessage } from "../utils/serialize";
import { MEETING_CODE_PATTERN } from "../utils/meeting-code";

const PAGE_SIZE = 100;

export async function listMessages(userId: string, meetingId: string, cursor?: string) {
  await assertParticipant(userId, meetingId);
  const messages = await prisma.message.findMany({
    where: { meetingId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const oldestId = messages[messages.length - 1]?.id ?? null;

  return {
    messages: [...messages].reverse().map(serializeMessage),
    nextCursor: messages.length === PAGE_SIZE ? oldestId : null,
  };
}

export async function createMessage(userId: string, meetingCode: string, text: string) {
  if (!MEETING_CODE_PATTERN.test(meetingCode)) {
    throw new HttpError(400, "Enter a valid meeting ID.");
  }

  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });
  if (!meeting) throw new HttpError(404, "Meeting not found.");
  if (meeting.status === "COMPLETED" || meeting.status === "CANCELLED") {
    throw new HttpError(400, "This meeting is not active.");
  }

  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
  });
  if (!participant || participant.leftAt) {
    throw new HttpError(403, "Join the meeting before chatting.");
  }

  const message = text.trim();
  if (!message) throw new HttpError(400, "Message cannot be empty.");
  if (message.length > 2000) throw new HttpError(400, "Message is too long.");

  const created = await prisma.message.create({
    data: { meetingId: meeting.id, userId, message },
    include: { user: { select: { id: true, name: true } } },
  });
  return serializeMessage(created);
}
