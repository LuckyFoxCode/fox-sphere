import {
  config,
  errorHandler,
  getStreamStatePrepared,
  Logger,
} from "@fox-sphere/backend-shared";
import { ClientToServerEvents, ServerToClientEvents } from "@fox-sphere/types";
import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app: Express = express();
const httpServer = createServer(app);

const allowedOrigin = config.allowedOrigin || "http://localhost:5173";

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/internal/events", (req, res) => {
  const { event, data } = req.body;
  if (event === undefined || data === undefined) {
    return res.status(400).json({ error: "Missing event or data" });
  }
  Logger.info("SocketServer", `Received internal event from worker: ${event}`);
  io.emit(event, data);
  res.json({ success: true });
});

io.on("connection", (socket) => {
  Logger.info("Socket", `Client connected: ${socket.id}`);
  socket.on("stream:get-system-state", async (_, socketCallback) => {
    try {
      socketCallback(await getStreamStatePrepared());
    } catch (error) {
      // Without this the ack never fires - Socket.io has no default timeout, so
      // the overlay waits forever - and the rejection is unhandled, which ends
      // the process and puts `restart: unless-stopped` into a loop.
      Logger.error(
        "Socket",
        `stream:get-system-state failed for ${socket.id}`,
        error,
      );
    }
  });
  socket.on("disconnect", () => {
    Logger.info("Socket", `Client disconnected: ${socket.id}`);
  });
});

app.use(errorHandler);

export { app, httpServer, io };
