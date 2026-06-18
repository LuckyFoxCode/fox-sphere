import { LotteryService } from "./modules/lottery";
import { ChatbotService } from "./modules/twitch/chatbot.service";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client";
import { TokenService } from "./modules/twitch/token.service";
import { TwitchAuthFactory } from "./modules/twitch/twitch-auth.factory";
import { TwitchConfig } from "./modules/twitch/twitch.types";
import { UserService } from "./modules/user";
import { config } from "./shared/config";
import { registerShutdownHandlers } from "./shared/infra";
import { globalEventBus, Logger } from "./shared/services";

async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const twitchConfig: TwitchConfig = config.twitch;

  const tokenService = new TokenService();
  const lotteryService = new LotteryService(twitchConfig); // <== edited
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

  Logger.info(
    "Bootstrap",
    "Application bootstrap completed. Live subscriptions active! 🚀",
  );
}

// Запуск всего воркера
bootstrap().catch((err) => {
  Logger.error(
    "Bootstrap",
    "Critical uncaught error during worker startup process",
    err,
  );
  process.exit(1);
});
