import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { recordingsRoot } from "./storage/local-file-storage";
import { registerSignaling } from "./websocket/signaling";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  },
});

registerSignaling(io);

const port = Number(process.env.PORT ?? 3000);
await mkdir(recordingsRoot(), { recursive: true });

httpServer.listen(port, () => {
  console.log(`FreeMeet API listening on http://localhost:${port}`);
});
