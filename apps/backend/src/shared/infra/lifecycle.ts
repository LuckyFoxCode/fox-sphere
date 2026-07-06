import { prisma } from "../lib/prisma";
import { Logger } from "../services";

export interface CleanupTask {
  name: string;
  action: () => Promise<void> | void;
}

export function registerShutdownHandlers(tasks: CleanupTask[]) {
  const gracefulShutdown = async (signal: string) => {
    Logger.info(
      "Shutdown",
      `Received signal ${signal}. Starting graceful shutdown... 🛑`,
    );

    for (const task of tasks) {
      try {
        Logger.info("Shutdown", `Executing cleanup task: ${task.name}...`);
        await task.action();
      } catch (error) {
        Logger.error(
          "Shutdown",
          `Error during cleanup task: ${task.name}`,
          error,
        );
      }
    }

    try {
      Logger.info("Shutdown", "Disconnecting Prisma client...");
      await prisma.$disconnect();
    } catch (err) {
      Logger.error("Shutdown", "Error disconnecting Prisma", err);
    }

    Logger.info("Shutdown", "Graceful shutdown complete. Goodbye! 👋");
    process.exit(0);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    Logger.error("Process", "CRITICAL: Uncaught Exception detected!", error);
    prisma.$disconnect().finally(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason, promise) => {
    Logger.error("Process", "CRITICAL: Unhandled Promise Rejection detected!", {
      reason,
      promise,
    });
    prisma.$disconnect().finally(() => process.exit(1));
  });
}
