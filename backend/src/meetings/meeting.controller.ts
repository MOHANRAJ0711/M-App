import type { Request, Response } from "express";
import { z } from "zod";
import {
  createMeeting,
  endMeeting,
  joinMeeting,
  leaveMeeting,
  listMeetings,
  previewMeeting,
  startMeeting,
} from "./meeting.service";
import { listMessages } from "../chat/message.service";
import { saveRecordingUpload } from "../recordings/recording.service";
import { routeParam } from "../utils/route-param";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long."),
});

const recordingMetaSchema = z.object({
  duration: z.coerce.number().int().min(0).max(24 * 60 * 60),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

export async function create(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const result = await createMeeting(req.user!.id, input.title);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  res.json(await listMeetings(req.user!.id));
}

export async function preview(req: Request, res: Response) {
  res.json({ meeting: await previewMeeting(routeParam(req.params.meetingCode)) });
}

export async function join(req: Request, res: Response) {
  const result = await joinMeeting(req.user!.id, routeParam(req.params.meetingCode));
  res.json(result);
}

export async function start(req: Request, res: Response) {
  res.json({ meeting: await startMeeting(req.user!.id, routeParam(req.params.meetingCode)) });
}

export async function leave(req: Request, res: Response) {
  res.json(await leaveMeeting(req.user!.id, routeParam(req.params.meetingCode)));
}

export async function end(req: Request, res: Response) {
  res.json({ meeting: await endMeeting(req.user!.id, routeParam(req.params.meetingCode)) });
}

export async function messages(req: Request, res: Response) {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  res.json(await listMessages(req.user!.id, routeParam(req.params.id), cursor));
}

export async function uploadRecording(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: "Recording file is required." });
    return;
  }

  try {
    const meta = recordingMetaSchema.parse(req.body);
    const recording = await saveRecordingUpload({
      userId: req.user!.id,
      meetingId: routeParam(req.params.id),
      sourcePath: req.file.path,
      mimeType: req.file.mimetype || "video/webm",
      duration: meta.duration,
      startedAt: new Date(meta.startedAt),
      endedAt: new Date(meta.endedAt),
    });
    res.status(201).json({ recording });
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(req.file.path, { force: true }).catch(() => undefined);
    throw error;
  }
}
