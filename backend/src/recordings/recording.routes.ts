import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { detail, download, list, remove, stream } from "./recording.controller";

export const recordingRouter = Router();

recordingRouter.use(requireAuth);
recordingRouter.get("/", list);
recordingRouter.get("/:id/stream", stream);
recordingRouter.get("/:id/download", download);
recordingRouter.get("/:id", detail);
recordingRouter.delete("/:id", remove);
