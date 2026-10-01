import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/utils/prisma";
import { createMessage } from "../src/chat/message.service";
import { assertInsideRecordings } from "../src/storage/local-file-storage";
import { MEETING_CODE_PATTERN } from "../src/utils/meeting-code";

const app = createApp();

async function resetDatabase() {
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
  fs.rmSync(path.resolve("recordings-test"), { recursive: true, force: true });
  fs.mkdirSync(path.resolve("recordings-test"), { recursive: true });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function register(email: string, name = "Test User") {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    name,
    email,
    password: "password123",
  });
  expect(response.status).toBe(201);
  return { agent, user: response.body.user as { id: string; name: string; email: string } };
}

describe("health and auth", () => {
  it("returns ok from /health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("registers, reads the session, logs out, and rejects a bad password", async () => {
    const { agent, user } = await register("ada@example.com", "Ada");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: "ada@example.com", name: "Ada" });
    expect(me.body.user.passwordHash).toBeUndefined();

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);
    const afterLogout = await agent.get("/api/auth/me");
    expect(afterLogout.status).toBe(401);

    const unauthenticated = await request(app).get("/api/auth/me");
    expect(unauthenticated.status).toBe(401);

    const badLogin = await request(app).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "wrong-password",
    });
    expect(badLogin.status).toBe(401);

    const login = await request(app).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "password123",
    });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(user.id);
  });
});

describe("meetings and chat", () => {
  it("creates, joins, rejects outsiders on end, and stores chat", async () => {
    const host = await register("host@example.com", "Host");
    const guest = await register("guest@example.com", "Guest");

    const created = await host.agent.post("/api/meetings").send({ title: "Project Discussion" });
    expect(created.status).toBe(201);
    expect(created.body.meetingCode).toMatch(MEETING_CODE_PATTERN);
    const meetingCode = created.body.meetingCode as string;
    const meetingId = created.body.meetingId as string;

    const preview = await host.agent.get(`/api/meetings/code/${meetingCode}`);
    expect(preview.status).toBe(200);
    expect(preview.body.meeting.status).toBe("SCHEDULED");

    const hostJoin = await host.agent.post(`/api/meetings/${meetingCode}/join`);
    expect(hostJoin.status).toBe(200);
    expect(hostJoin.body.meeting.status).toBe("LIVE");
    expect(hostJoin.body.role).toBe("HOST");

    const guestJoin = await guest.agent.post(`/api/meetings/${meetingCode}/join`);
    expect(guestJoin.status).toBe(200);
    expect(guestJoin.body.role).toBe("PARTICIPANT");

    const missing = await guest.agent.post("/api/meetings/AAA-222-BBB/join");
    expect(missing.status).toBe(404);

    const denied = await guest.agent.post(`/api/meetings/${meetingCode}/end`);
    expect(denied.status).toBe(403);

    const saved = await createMessage(host.user.id, meetingCode, "Hello everyone");
    const history = await guest.agent.get(`/api/meetings/${meetingId}/messages`);
    expect(history.status).toBe(200);
    expect(history.body.messages).toEqual([
      expect.objectContaining({ id: saved.id, message: "Hello everyone", name: "Host" }),
    ]);

    const ended = await host.agent.post(`/api/meetings/${meetingCode}/end`);
    expect(ended.status).toBe(200);
    expect(ended.body.meeting.status).toBe("COMPLETED");
    expect(typeof ended.body.meeting.durationSeconds).toBe("number");

    const rejoin = await guest.agent.post(`/api/meetings/${meetingCode}/join`);
    expect(rejoin.status).toBe(400);
  });

  it("rejects a cancelled meeting and a sixth participant", async () => {
    const host = await register("full-host@example.com", "Host");
    const created = await host.agent.post("/api/meetings").send({ title: "Full room" });
    const meetingCode = created.body.meetingCode as string;
    await host.agent.post(`/api/meetings/${meetingCode}/join`);

    for (let index = 0; index < 4; index += 1) {
      const person = await register(`person-${index}@example.com`, `Person ${index}`);
      const joined = await person.agent.post(`/api/meetings/${meetingCode}/join`);
      expect(joined.status).toBe(200);
    }

    const extra = await register("extra@example.com", "Extra");
    const full = await extra.agent.post(`/api/meetings/${meetingCode}/join`);
    expect(full.status).toBe(403);

    await prisma.meeting.update({
      where: { meetingCode },
      data: { status: "CANCELLED" },
    });
    const cancelled = await host.agent.post(`/api/meetings/${meetingCode}/join`);
    expect(cancelled.status).toBe(400);
  });
});

describe("recordings", () => {
  it("stores a host recording and blocks other accounts", async () => {
    const host = await register("rec-host@example.com", "Host");
    const guest = await register("rec-guest@example.com", "Guest");
    const stranger = await register("stranger@example.com", "Stranger");
    const created = await host.agent.post("/api/meetings").send({ title: "Demo" });
    const meetingCode = created.body.meetingCode as string;
    const meetingId = created.body.meetingId as string;
    await host.agent.post(`/api/meetings/${meetingCode}/join`);
    await guest.agent.post(`/api/meetings/${meetingCode}/join`);

    const startedAt = new Date(Date.now() - 4000).toISOString();
    const endedAt = new Date().toISOString();
    const upload = await host.agent
      .post(`/api/meetings/${meetingId}/recordings`)
      .field("duration", "4")
      .field("startedAt", startedAt)
      .field("endedAt", endedAt)
      .attach("recording", Buffer.from("fake-webm"), {
        filename: "recording.webm",
        contentType: "video/webm",
      });
    expect(upload.status).toBe(201);
    const recordingId = upload.body.recording.id as string;

    const guestDenied = await guest.agent
      .post(`/api/meetings/${meetingId}/recordings`)
      .field("duration", "1")
      .field("startedAt", startedAt)
      .field("endedAt", endedAt)
      .attach("recording", Buffer.from("nope"), {
        filename: "recording.webm",
        contentType: "video/webm",
      });
    expect(guestDenied.status).toBe(403);

    const stream = await guest.agent.get(`/api/recordings/${recordingId}/stream`);
    expect(stream.status).toBe(200);
    expect(stream.headers["content-type"]).toContain("video/webm");

    const outsider = await stranger.agent.get(`/api/recordings/${recordingId}/download`);
    expect(outsider.status).toBe(403);
    const outsiderDelete = await stranger.agent.delete(`/api/recordings/${recordingId}`);
    expect(outsiderDelete.status).toBe(403);

    const list = await host.agent.get("/api/recordings").query({ search: "demo", sort: "newest" });
    expect(list.status).toBe(200);
    expect(list.body.recordings).toHaveLength(1);

    await prisma.recording.update({
      where: { id: recordingId },
      data: { filePath: "../package.json" },
    });
    const traversal = await host.agent.get(`/api/recordings/${recordingId}/stream`);
    expect(traversal.status).toBe(400);
    expect(() => assertInsideRecordings("../package.json")).toThrow(/Invalid recording path/);

    await prisma.recording.update({
      where: { id: recordingId },
      data: { filePath: upload.body.recording.fileName },
    });
  });

  it("lets the host delete a recording", async () => {
    const host = await register("delete-host@example.com", "Host");
    const created = await host.agent.post("/api/meetings").send({ title: "Delete me" });
    await host.agent.post(`/api/meetings/${created.body.meetingCode}/join`);
    const upload = await host.agent
      .post(`/api/meetings/${created.body.meetingId}/recordings`)
      .field("duration", "1")
      .field("startedAt", new Date().toISOString())
      .field("endedAt", new Date().toISOString())
      .attach("recording", Buffer.from("fake-webm"), {
        filename: "recording.webm",
        contentType: "video/webm",
      });
    const recordingId = upload.body.recording.id as string;
    const removed = await host.agent.delete(`/api/recordings/${recordingId}`);
    expect(removed.status).toBe(200);
    const missing = await host.agent.get(`/api/recordings/${recordingId}`);
    expect(missing.status).toBe(404);
  });
});
