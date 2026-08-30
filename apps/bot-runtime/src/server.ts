import { httpServer } from "./app";
import { config, Logger } from "@fox-sphere/backend-shared";

httpServer.listen(config.port, () => {
  Logger.info("Server", `Bot backend with Socket.io on http://localhost:${config.port} 🦊`);
});
