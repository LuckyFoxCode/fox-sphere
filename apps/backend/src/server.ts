import { app } from "./app.js";
import { config } from "./shared/config/index.js";
import { Logger } from "./shared/services/logger.service.js";

const startServer = () => {
  try {
    app.listen(config.port, () => {
      Logger.info(
        "Server",
        `Backend is running on http://localhost:${config.port} 🦊`,
      );
    });
  } catch (error) {
    Logger.error("Server", "Failed to start HTTP server", error);
    process.exit(1);
  }
};

startServer();
