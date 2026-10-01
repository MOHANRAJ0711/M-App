import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { uploadLimiter } from "../middleware/rate-limit";
import { recordingUpload } from "../recordings/recording.upload";
import {
  create,
  end,
  join,
  leave,
  list,
  messages,
  preview,
  start,
  uploadRecording,
} from "./meeting.controller";

export const meetingRouter = Router();

meetingRouter.get("/code/:meetingCode", preview);
meetingRouter.use(requireAuth);
meetingRouter.post("/", create);
meetingRouter.get("/", list);
meetingRouter.post("/:meetingCode/join", join);
meetingRouter.post("/:meetingCode/start", start);
meetingRouter.post("/:meetingCode/leave", leave);
meetingRouter.post("/:meetingCode/end", end);
meetingRouter.get("/:id/messages", messages);
meetingRouter.post(
  "/:id/recordings",
  uploadLimiter,
  recordingUpload.single("recording"),
  uploadRecording,
);
