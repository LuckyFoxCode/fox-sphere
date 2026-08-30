// The combined production process: the HTTP + Socket.io server AND the Twitch worker in
// ONE Node process. forwardEventToBackend() still POSTs to localhost, which is now the
// same process - a redundant hop, but zero refactoring and one code path shared with dev,
// where these are two separate processes.
// The server comes from ./app - this package's own HTTP + Socket.io bot backend, not from
// apps/api (that one is the separate, local-only admin backend).
// One container instead of two, which is what the free Oracle VM needs.
import { httpServer } from "./app";
import { config, Logger } from "@fox-sphere/backend-shared";
import { bootstrap } from "./worker";

async function main() {
  // 1) Start the server FIRST - the worker posts its events to /api/internal/events.
  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, () => {
      Logger.info(
        "Prod",
        `Server + worker in one process on http://localhost:${config.port} 🦊`,
      );
      resolve();
    });
  });

  // 2) Then boot the Twitch worker (chatbot + EventSub).
  await bootstrap();
}

main().catch((err) => {
  Logger.error("Prod", "Fatal error during combined startup", err);
  process.exit(1);
});
