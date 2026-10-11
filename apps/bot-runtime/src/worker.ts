import { config, Logger } from "@fox-sphere/backend-shared";
import { pathToFileURL } from "url";
import { HeroService } from "./modules/hero";
import { LotteryService } from "./modules/lottery";
import { StreamService } from "./modules/stream";
import { ChatbotService } from "./modules/twitch/chatbot.service";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client";
import { TokenService } from "./modules/twitch/token.service";
import { TwitchAuthFactory } from "./modules/twitch/twitch-auth.factory";
import { TwitchConfig } from "./modules/twitch/twitch.types";
import { UserService } from "./modules/user";
import { registerShutdownHandlers } from "./shared/infra";
import { globalEventBus, registerEventForwarders } from "./shared/services";

const FOLLOW_COOLDOWN_MS = 60_000;
const lastFollowByUser = new Map<string, number>();

export async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const twitchConfig: TwitchConfig = config.twitch;

  const heroService = new HeroService();
  const streamService = new StreamService();
  const tokenService = new TokenService();
  const lotteryService = new LotteryService(twitchConfig);
  const userService = new UserService(lotteryService, streamService, heroService);

  // init() subscribes to `user:created`, so it must run before the chatbot accepts
  // a single message — otherwise the assignment is dropped for whoever writes first.
  heroService.init();

  // Создаем авторизацию через фабрику
  const authProvider = await TwitchAuthFactory.create(tokenService);

  // Инициализируем сервисы
  const chatbotService = new ChatbotService(
    authProvider,
    userService,
    streamService,
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
    const now = Date.now();
    const lastFollow = lastFollowByUser.get(event.userId);
    if (lastFollow !== undefined && now - lastFollow < FOLLOW_COOLDOWN_MS) {
      Logger.debug(
        "Bootstrap",
        `Skipped duplicate follow for ${event.userDisplayName} within cooldown window`,
      );
      return;
    }
    lastFollowByUser.set(event.userId, now);
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
      redemptionId: data.redemptionId,
    });
  });

  // Backfill is silent: it assigns but never emits, so the first deploy after the
  // migration cannot fire the "New Hero" widget once per existing viewer. Only the
  // `user:created` path announces. This runs after `chatbotService.start()`, so a viewer
  // who messages in between gets their hero from the lazy path instead - which is also
  // silent, and their `chat:message` carries the hero, so the lane still spawns them.
  await heroService.assignHeroToExistingUsersWithoutOne();

  // Every forwarder below is registered after the chatbot is live, so an event emitted in
  // the window between start() and here reaches a bus with no listener and is dropped.
  // `chat:message` is equally late, so no viewer sees a half-delivered spawn.
  registerEventForwarders();

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
