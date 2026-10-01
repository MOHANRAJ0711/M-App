import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./auth/auth.routes";
import { authLimiter } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error";
import { meetingRouter } from "./meetings/meeting.routes";
import { recordingRouter } from "./recordings/recording.routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/meetings", meetingRouter);
  app.use("/api/recordings", recordingRouter);
  app.use(errorHandler);
  return app;
}
