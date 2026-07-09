import { pathToFileURL } from "url";
import { LotteryService } from "./modules/lottery";
import { ChatbotService } from "./modules/twitch/chatbot.service";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client";
import { TokenService } from "./modules/twitch/token.service";
import { TwitchAuthFactory } from "./modules/twitch/twitch-auth.factory";
import { TwitchConfig } from "./modules/twitch/twitch.types";
import { UserService } from "./modules/user";
import { config } from "./shared/config";
import { registerShutdownHandlers } from "./shared/infra";
import {
  forwardEventToBackend,
  globalEventBus,
  Logger,
} from "./shared/services";

export async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const twitchConfig: TwitchConfig = config.twitch;

  const tokenService = new TokenService();
  const lotteryService = new LotteryService(twitchConfig);
  const userService = new UserService(lotteryService);

  // Создаем авторизацию через фабрику
  const authProvider = await TwitchAuthFactory.create(tokenService);

  // Инициализируем сервисы
  const chatbotService = new ChatbotService(
    authProvider,
    userService,
    twitchConfig,
  );
  const eventSubClient = new TwitchEventSubClient(authProvider, twitchConfig);

  // Регистрируем таски для плавного выключения (Graceful Shutdown)
  // Наш хендлер сам по цепочке всё закроет, глобальные переменные больше не нужны!
  registerShutdownHandlers([
    { name: "Twitch EventSub", action: () => eventSubClient.stop() },
    { name: "Twitch Chatbot", action: () => chatbotService.stop() },
  ]);

  // Запуск сервисов
  await chatbotService.start();
  await eventSubClient.start();

  // Подписки на события
  await eventSubClient.subscribeToFollows(async (event) => {
    globalEventBus.emit("twitch:follow", {
      userId: event.userId,
      username: event.userDisplayName,
    });
  });

  await eventSubClient.subscribeToRaids(async (event) => {
    globalEventBus.emit("twitch:raid", {
      raiderId: event.raidingBroadcasterId,
      raiderName: event.raidingBroadcasterDisplayName,
      viewers: event.viewers,
    });
  });

  await eventSubClient.subscribeToRewards(async (data) => {
    globalEventBus.emit("twitch:reward-redeem", {
      userId: data.userId,
      username: data.userDisplayName,
      rewardTitle: data.rewardTitle,
    });
  });

  globalEventBus.on("lottery:ticket-earned", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Ticket earned | User: ${data.username}`,
    );
    await forwardEventToBackend("lottery:ticket-earned", data);
  });

  globalEventBus.on("lottery:started", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Lottery command triggered! Total duration: ${data.duration}s. Forwarding to overlay...`,
    );
    await forwardEventToBackend("lottery:started", data);
  });

  globalEventBus.on("lottery:winners", async (data) => {
    Logger.info("Bootstrap", `.𖥔 ݁ ˖ִ🛸༄˖°. Lottery winners...`);
    await forwardEventToBackend("lottery:winners", data);
  });

  globalEventBus.on("lottery:winner-drawn", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Победитель #${data.place} объявлен в чате, шлем на оверлей!`,
    );
    await forwardEventToBackend("lottery:winner-drawn", data);
  });

  globalEventBus.on("lottery:finished", async (data) => {
    Logger.info(
      "Bootstrap",
      ".𖥔 ݁ ˖ִ🛸༄˖°. Lottery finished event captured, forwarding to Socket.io via Backend!",
    );
    await forwardEventToBackend("lottery:finished", data);
  });

  globalEventBus.on("twitch:add-vip", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:add-vip to overlay for: ${data.username}`,
    );
    await forwardEventToBackend("twitch:add-vip", data);
  });

  globalEventBus.on("twitch:follow", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:follow to overlay for: ${data.username}`,
    );
    await forwardEventToBackend("twitch:follow", data);
  });

  globalEventBus.on("twitch:raid", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:raid to overlay from: ${data.raiderName}`,
    );
    await forwardEventToBackend("twitch:raid", data);
  });

  globalEventBus.on("twitch:reward-redeem", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding reward-redeem to overlay: ${data.rewardTitle}`,
    );
    await forwardEventToBackend("twitch:reward-redeem", data);
  });
  globalEventBus.on("twitch:timer", async (data) => {
    Logger.info("Bootstrap", `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding timer to overlay`);
    await forwardEventToBackend("twitch:timer", data);
  });

  globalEventBus.on("user:level-up", async (data) => {
    Logger.info(
      "Bootstrap",
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding level-up to overlay | User: ${data.username}, New Level: ${data.newLevel}`,
    );
    await forwardEventToBackend("user:level-up", data);
  });

  Logger.info(
    "Bootstrap",
    "Application bootstrap completed. Live subscriptions active! 🚀",
  );
}

// Auto-run ТОЛЬКО при прямом запуске (`tsx worker.ts`, dev-воркер).
// При импорте из prod.ts (объединённый процесс) bootstrap вызывается вручную —
// иначе воркер стартовал бы дважды.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  bootstrap().catch((err) => {
    Logger.error(
      "Bootstrap",
      "Critical uncaught error during worker startup process",
      err,
    );
    process.exit(1);
  });
}
