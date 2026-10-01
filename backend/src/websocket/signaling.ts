import type { Server, Socket } from "socket.io";
import { parseCookie } from "cookie";
import { readUserId } from "../auth/auth.tokens";
import { COOKIE_NAME } from "../auth/auth.tokens";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { getMeetingForSocket, MAX_PARTICIPANTS, endMeeting } from "../meetings/meeting.service";
import { createMessage } from "../chat/message.service";
import type { ParticipantRole } from "@prisma/client";

export type RoomPeer = {
  socketId: string;
  userId: string;
  name: string;
  role: ParticipantRole;
};

type RecordingFlag = { active: boolean; startedAt: string | null };

const rooms = new Map<string, Map<string, RoomPeer>>();
const recordingState = new Map<string, RecordingFlag>();
const screenSharers = new Map<string, string>();
const messageTimes = new Map<string, number[]>();

export function resetSignalingState() {
  rooms.clear();
  recordingState.clear();
  screenSharers.clear();
  messageTimes.clear();
}

function roomName(meetingCode: string) {
  return `meeting:${meetingCode}`;
}

function peersOf(meetingCode: string) {
  let room = rooms.get(meetingCode);
  if (!room) {
    room = new Map();
    rooms.set(meetingCode, room);
  }
  return room;
}

function publicPeers(meetingCode: string) {
  return Array.from(peersOf(meetingCode).values());
}

function allowMessage(socketId: string) {
  const now = Date.now();
  const recent = (messageTimes.get(socketId) ?? []).filter((time) => now - time < 10_000);
  if (recent.length >= 20) {
    messageTimes.set(socketId, recent);
    return false;
  }
  recent.push(now);
  messageTimes.set(socketId, recent);
  return true;
}

async function authenticateSocket(socket: Socket) {
  const header = socket.handshake.headers.cookie;
  const token = header ? parseCookie(header)[COOKIE_NAME] : undefined;
  if (!token) throw new HttpError(401, "Authentication required.");
  const userId = readUserId(token);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, "Authentication required.");
  socket.data.user = { id: user.id, name: user.name, email: user.email };
}

function socketUser(socket: Socket) {
  return socket.data.user as { id: string; name: string; email: string };
}

export function registerSignaling(io: Server) {
  io.use(async (socket, next) => {
    try {
      await authenticateSocket(socket);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Authentication required."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-meeting", async (payload: { meetingCode?: string }, ack?: (value: unknown) => void) => {
      try {
        const meetingCode = payload?.meetingCode ?? "";
        const user = socketUser(socket);
        const { meeting, participant } = await getMeetingForSocket(meetingCode, user.id);
        const room = peersOf(meeting.meetingCode);
        const already = Array.from(room.values()).some((peer) => peer.userId === user.id && peer.socketId === socket.id);
        const uniqueUsers = new Set(Array.from(room.values()).map((peer) => peer.userId));
        if (!already && !uniqueUsers.has(user.id) && uniqueUsers.size >= MAX_PARTICIPANTS) {
          throw new HttpError(403, "This meeting is full (5 participants).");
        }

        for (const [socketId, peer] of room) {
          if (peer.userId === user.id && socketId !== socket.id) {
            io.to(socketId).emit("session-replaced", {
              message: "You joined this meeting from another tab.",
            });
            io.sockets.sockets.get(socketId)?.leave(roomName(meeting.meetingCode));
            io.sockets.sockets.get(socketId)?.disconnect(true);
            room.delete(socketId);
          }
        }

        const peer: RoomPeer = {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          role: participant.role,
        };
        room.set(socket.id, peer);
        await socket.join(roomName(meeting.meetingCode));
        socket.data.meetingCode = meeting.meetingCode;

        socket.to(roomName(meeting.meetingCode)).emit("user-joined", peer);
        const others = publicPeers(meeting.meetingCode).filter((item) => item.socketId !== socket.id);
        socket.emit("participants", others);
        ack?.({ participants: others, you: peer });
        const recording = recordingState.get(meeting.meetingCode);
        if (recording?.active) socket.emit("recording-state", recording);
        const sharer = screenSharers.get(meeting.meetingCode);
        if (sharer) socket.emit("screen-share", { userId: sharer, active: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not join the meeting.";
        ack?.({ error: message });
      }
    });

    socket.on("leave-meeting", () => {
      removePeer(io, socket, false);
    });

    socket.on("disconnect", () => {
      removePeer(io, socket, false);
    });

    socket.on(
      "offer",
      (payload: { to?: string; description?: unknown }) => relay(socket, payload?.to, "offer", payload),
    );
    socket.on(
      "answer",
      (payload: { to?: string; description?: unknown }) => relay(socket, payload?.to, "answer", payload),
    );
    socket.on(
      "ice-candidate",
      (payload: { to?: string; candidate?: unknown }) => relay(socket, payload?.to, "ice-candidate", payload),
    );

    socket.on("send-message", async (payload: { meetingCode?: string; message?: string }) => {
      try {
        if (!allowMessage(socket.id)) return;
        const user = socketUser(socket);
        const meetingCode = (socket.data.meetingCode as string | undefined) || payload?.meetingCode || "";
        const saved = await createMessage(user.id, meetingCode, payload?.message ?? "");
        io.to(roomName(meetingCode)).emit("receive-message", saved);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send the message.";
        socket.emit("chat-error", { error: message });
      }
    });

    socket.on("screen-share", (payload: { active?: boolean }) => {
      const meetingCode = socket.data.meetingCode as string | undefined;
      if (!meetingCode) return;
      const peer = rooms.get(meetingCode)?.get(socket.id);
      if (!peer) return;
      const active = Boolean(payload?.active);
      if (active) screenSharers.set(meetingCode, peer.userId);
      else if (screenSharers.get(meetingCode) === peer.userId) screenSharers.delete(meetingCode);
      io.to(roomName(meetingCode)).emit("screen-share", { userId: peer.userId, active });
    });

    socket.on("start-recording", async () => {
      await withHost(socket, async (meetingCode) => {
        const state = { active: true, startedAt: new Date().toISOString() };
        recordingState.set(meetingCode, state);
        io.to(roomName(meetingCode)).emit("recording-state", state);
      });
    });

    socket.on("stop-recording", async () => {
      await withHost(socket, async (meetingCode) => {
        const state = { active: false, startedAt: recordingState.get(meetingCode)?.startedAt ?? null };
        recordingState.set(meetingCode, state);
        io.to(roomName(meetingCode)).emit("recording-state", state);
      });
    });

    socket.on("mute-participant", async (payload: { userId?: string }) => {
      await withHost(socket, async (meetingCode) => {
        const target = findPeerByUser(meetingCode, payload?.userId ?? "");
        if (!target) return;
        io.to(target.socketId).emit("force-mute");
      });
    });

    socket.on("remove-participant", async (payload: { userId?: string }) => {
      await withHost(socket, async (meetingCode, user) => {
        const targetUserId = payload?.userId ?? "";
        if (!targetUserId || targetUserId === user.id) return;
        const target = findPeerByUser(meetingCode, targetUserId);
        const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });
        if (!meeting) return;
        await prisma.meetingParticipant.updateMany({
          where: { meetingId: meeting.id, userId: targetUserId },
          data: { leftAt: new Date() },
        });
        if (target) {
          io.to(target.socketId).emit("removed", { message: "The host removed you from the meeting." });
          io.sockets.sockets.get(target.socketId)?.disconnect(true);
        }
        io.to(roomName(meetingCode)).emit("user-left", { userId: targetUserId });
      });
    });

    socket.on("end-meeting", async () => {
      try {
        const meetingCode = socket.data.meetingCode as string | undefined;
        if (!meetingCode) return;
        const user = socketUser(socket);
        await endMeeting(user.id, meetingCode);
        recordingState.delete(meetingCode);
        io.to(roomName(meetingCode)).emit("meeting-ended");
        io.in(roomName(meetingCode)).disconnectSockets(true);
        rooms.delete(meetingCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not end the meeting.";
        socket.emit("meeting-error", { error: message });
      }
    });
  });
}

function findPeerByUser(meetingCode: string, userId: string) {
  return Array.from(peersOf(meetingCode).values()).find((peer) => peer.userId === userId);
}

function relay(socket: Socket, to: string | undefined, event: string, payload: unknown) {
  const meetingCode = socket.data.meetingCode as string | undefined;
  if (!meetingCode || !to) return;
  const room = rooms.get(meetingCode);
  if (!room?.has(socket.id) || !room.has(to)) return;
  const sender = room.get(socket.id);
  ioEmitTo(socket, to, event, {
    ...(payload as object),
    from: socket.id,
    userId: sender?.userId,
    name: sender?.name,
    role: sender?.role,
  });
}

function ioEmitTo(socket: Socket, to: string, event: string, payload: unknown) {
  socket.to(to).emit(event, payload);
}

function removePeer(io: Server, socket: Socket, silent: boolean) {
  const meetingCode = socket.data.meetingCode as string | undefined;
  if (!meetingCode) return;
  const room = rooms.get(meetingCode);
  const peer = room?.get(socket.id);
  room?.delete(socket.id);
  socket.leave(roomName(meetingCode));
  if (!silent && peer) {
    io.to(roomName(meetingCode)).emit("user-left", { socketId: socket.id, userId: peer.userId });
  }
  if (peer && screenSharers.get(meetingCode) === peer.userId) {
    screenSharers.delete(meetingCode);
    io.to(roomName(meetingCode)).emit("screen-share", { userId: peer.userId, active: false });
  }
  if (room && room.size === 0) {
    rooms.delete(meetingCode);
    screenSharers.delete(meetingCode);
  }
}

async function withHost(
  socket: Socket,
  action: (meetingCode: string, user: { id: string; name: string; email: string }) => Promise<void>,
) {
  try {
    const meetingCode = socket.data.meetingCode as string | undefined;
    if (!meetingCode) return;
    const user = socketUser(socket);
    const peer = rooms.get(meetingCode)?.get(socket.id);
    if (!peer || peer.role !== "HOST") {
      socket.emit("meeting-error", { error: "Only the host can do that." });
      return;
    }
    await action(meetingCode, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    socket.emit("meeting-error", { error: message });
  }
}
