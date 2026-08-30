import { httpServer } from "./app";
import { config, Logger } from "@fox-sphere/backend-shared";

// See apps/api/src/server.ts - listen() failures arrive as an event, not a throw.
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  const hint =
    error.code === "EADDRINUSE"
      ? ` - port ${config.port} is already in use; stop the other process or set PORT`
      : "";

  Logger.error("Server", `Failed to start HTTP server${hint}`, error);
  process.exit(1);
});

httpServer.listen(config.port, () => {
  Logger.info("Server", `Bot backend with Socket.io on http://localhost:${config.port} 🦊`);
});
