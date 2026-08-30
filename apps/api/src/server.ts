import { httpServer } from "./app";
import { Logger } from "@fox-sphere/backend-shared";
import { apiPort } from "./port";

// listen() reports EADDRINUSE / EACCES as an 'error' event, never as a throw -
// a try/catch around it can never fire.
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  const hint =
    error.code === "EADDRINUSE"
      ? ` - port ${apiPort} is already in use; stop the other process or set API_PORT`
      : "";

  Logger.error("Server", `Failed to start HTTP server${hint}`, error);
  process.exit(1);
});

httpServer.listen(apiPort, () => {
  Logger.info("Server", `Admin backend + swagger on http://localhost:${apiPort} 🦊`);
});
