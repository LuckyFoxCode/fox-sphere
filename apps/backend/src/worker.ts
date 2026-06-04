import { ChatbotService } from "./modules/twitch/chatbot.service";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client";
import { TokenService } from "./modules/twitch/token.service";
import { TwitchAuthFactory } from "./modules/twitch/twitch-auth.factory";
import { UserService } from "./modules/twitch/user.service";
import { config } from "./shared/config/";
import { registerShutdownHandlers } from "./shared/infra/lifecycle";
import { globalEventBus } from "./shared/services/event-bus.service";
import { Logger } from "./shared/services/logger.service";

async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const tokenService = new TokenService();
  const userService = new UserService();

  // Создаем авторизацию через фабрику
  const authProvider = await TwitchAuthFactory.create(tokenService);

  const twitchConfig = {
    botId: config.twitch.botId,
    userId: config.twitch.userId,
    channelName: config.twitch.channelName,
  };

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
