import type { Meeting, MeetingParticipant, Message, Recording, User } from "@prisma/client";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

export function toPublicUser(user: Pick<User, "id" | "name" | "email" | "avatar">): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
}

export function serializeMeeting(
  meeting: Meeting,
  role?: MeetingParticipant["role"] | null,
) {
  return {
    id: meeting.id,
    meetingCode: meeting.meetingCode,
    title: meeting.title,
    hostId: meeting.hostId,
    status: meeting.status,
    createdAt: meeting.createdAt,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    durationSeconds: meeting.durationSeconds,
    role: role ?? null,
  };
}

export function serializeMessage(
  message: Message & { user: Pick<User, "id" | "name"> },
) {
  return {
    id: message.id,
    meetingId: message.meetingId,
    userId: message.userId,
    name: message.user.name,
    message: message.message,
    createdAt: message.createdAt,
  };
}

export function serializeRecording(
  recording: Recording & { meeting?: Pick<Meeting, "id" | "title" | "meetingCode"> },
) {
  return {
    id: recording.id,
    meetingId: recording.meetingId,
    meetingTitle: recording.meeting?.title ?? null,
    meetingCode: recording.meeting?.meetingCode ?? null,
    fileName: recording.fileName,
    fileSize: recording.fileSize,
    duration: recording.duration,
    mimeType: recording.mimeType,
    startedAt: recording.startedAt,
    endedAt: recording.endedAt,
    createdAt: recording.createdAt,
  };
}
