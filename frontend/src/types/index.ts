export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

export type MeetingStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
export type ParticipantRole = "HOST" | "PARTICIPANT";

export type Meeting = {
  id: string;
  meetingCode: string;
  title: string;
  hostId: string;
  status: MeetingStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  role: ParticipantRole | null;
};

export type Participant = {
  id: string;
  userId: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
  leftAt: string | null;
};

export type ChatMessage = {
  id: string;
  meetingId: string;
  userId: string;
  name: string;
  message: string;
  createdAt: string;
};

export type Recording = {
  id: string;
  meetingId: string;
  meetingTitle: string | null;
  meetingCode: string | null;
  fileName: string;
  fileSize: number;
  duration: number | null;
  mimeType: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

export type RemotePeer = {
  socketId: string;
  userId: string;
  name: string;
  role: ParticipantRole;
  stream: MediaStream;
};
