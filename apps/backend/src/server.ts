import { app } from "./app.js";
import { config } from "./shared/config/index.js";

const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log(`🦊 Backend ranges on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
