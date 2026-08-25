import { ClientToServerEvents, ServerToClientEvents } from "@fox-sphere/types";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import { config } from "./shared/config";
import { errorHandler } from "./shared/middleware/error-handler";
import { generateOpenAPISpec } from "./shared/openapi/generator";
import { getStreamStatePrepared, Logger } from "./shared/services";
import { channelRouter } from "./modules/channel";

const app = express();
const httpServer = createServer(app);

const allowedOrigin = config.allowedOrigin || "http://localhost:5173";

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/internal/events", (req, res) => {
  const { event, data } = req.body;

  if (!event || !data) {
    return res.status(400).json({ error: "Missing event or data" });
  }

  Logger.info("SocketServer", `Received internal event from worker: ${event}`);

  io.emit(event, data);

  res.json({ success: true });
});

io.on("connection", (socket) => {
  Logger.info("Socket", `Client connected: ${socket.id}`);

  socket.on("stream:get-system-state", async (_, socketCallback) => {
    const state = await getStreamStatePrepared();
    socketCallback(state);
  });

  socket.on("disconnect", () => {
    Logger.info("Socket", `Client disconnected: ${socket.id}`);
  });
});

app.use("/api", channelRouter);

const openApiSpec = generateOpenAPISpec();
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

app.use(errorHandler);
export { app, httpServer, io };
