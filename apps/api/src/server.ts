import { httpServer } from "./app";
import { Logger } from "@fox-sphere/backend-shared";
import { apiPort } from "./port";

const startServer = () => {
  try {
    httpServer.listen(apiPort, () => {
      Logger.info(
        "Server",
        `Admin backend + swagger on http://localhost:${apiPort} 🦊`,
      );
    });
  } catch (error) {
    Logger.error("Server", "Failed to start HTTP server", error);
    process.exit(1);
  }
};

startServer();
