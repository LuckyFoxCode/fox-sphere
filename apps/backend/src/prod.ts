// Объединённый production-процесс: HTTP+Socket.io сервер И Twitch-воркер в ОДНОМ
// Node-процессе. Оба делят in-memory globalEventBus. forwardEventToBackend()
// теперь бьёт в localhost (тот же процесс) — лишний хоп, но нулевой рефактор и
// полная совместимость с dev, где это два раздельных процесса.
// Один контейнер вместо двух — то, что нужно для бесплатной Oracle VM.
import { httpServer } from "./app";
import { config } from "./shared/config";
import { Logger } from "./shared/services";
import { bootstrap } from "./worker";

async function main() {
  // 1) Поднимаем сервер ПЕРВЫМ — воркер шлёт события на его /api/internal/events.
  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, () => {
      Logger.info(
        "Prod",
        `Server + worker in one process on http://localhost:${config.port} 🦊`,
      );
      resolve();
    });
  });

  // 2) Затем запускаем Twitch-воркер (chatbot + EventSub).
  await bootstrap();
}

main().catch((err) => {
  Logger.error("Prod", "Fatal error during combined startup", err);
  process.exit(1);
});
