import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatbotService } from "./modules/twitch/chatbot.service";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client";
import { TokenService } from "./modules/twitch/token.service";
import { UserService } from "./modules/twitch/user.service";
import { config } from "./shared/config/";
import { AppError } from "./shared/errors/app-error";
import { prisma } from "./shared/lib/prisma";
import { globalEventBus } from "./shared/services/event-bus.service";
import { Logger } from "./shared/services/logger.service";

async function seedTokensIfNeeded(
  botId: string,
  userId: string,
): Promise<void> {
  const existingBotToken = await prisma.twitchToken.findUnique({
    where: { twitchUserId: botId },
  });

  if (!existingBotToken) {
    await prisma.twitchToken.create({
      data: {
        id: crypto.randomUUID(),
        twitchUserId: botId,
        accessToken: config.twitch.botAccessToken,
        refreshToken: config.twitch.botRefreshToken,
        expiresIn: 14400,
        obtainmentTimestamp: Date.now(),
      },
    });

    Logger.info(
      "Bootstrap",
      "Initial bot tokens successfully seeded into the database.🎉",
    );
  }

  const existingStreamerToken = await prisma.twitchToken.findUnique({
    where: { twitchUserId: userId },
  });

  if (!existingStreamerToken) {
    await prisma.twitchToken.create({
      data: {
        id: crypto.randomUUID(),
        twitchUserId: userId,
        accessToken: config.twitch.clientAccessToken,
        refreshToken: config.twitch.clientRefreshToken,
        expiresIn: 14400,
        obtainmentTimestamp: Date.now(),
      },
    });

    Logger.info(
      "Bootstrap",
      "Initial streamer tokens successfully seeded into the database.🎉",
    );
  }
}

async function initTwitchModule(
  authProvider: RefreshingAuthProvider,
  userService: UserService,
) {
  const twitchConfig = {
    botId: config.twitch.botId,
    userId: config.twitch.userId,
    channelName: config.twitch.channelName,
  };

  const chatbotService = new ChatbotService(
    authProvider,
    userService,
    twitchConfig,
  );
  const eventSubClient = new TwitchEventSubClient(authProvider, twitchConfig);

  await chatbotService.start();
  await eventSubClient.start();

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
}

async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const botId = config.twitch.botId;
  const userId = config.twitch.userId;

  // Проверяем/наполняем базу токенами
  await seedTokensIfNeeded(botId, userId);

  const tokenService = new TokenService();
  const userService = new UserService();

  // Достаем актуальные токены из базы
  const botTokenRecord = await tokenService.getToken(botId);
  const streamerTokenRecord = await tokenService.getToken(userId);

  if (!botTokenRecord || !streamerTokenRecord) {
    throw new AppError(
      "Failed to initialize Twitch tokens (Bot or Streamer) from database.",
      500,
    );
  }

  // Создаем менеджер авторизации Twurple
  const authProvider = new RefreshingAuthProvider({
    clientId: config.twitch.clientId,
    clientSecret: config.twitch.clientSecret,
  });

  // Навешиваем авто-обновление токенов в БД при их протухании
  authProvider.onRefresh(async (userId, tokenData) => {
    await tokenService.updateToken(userId, tokenData);
    Logger.debug(
      "Bootstrap",
      `Tokens for user ${userId} automatically refreshed by Twurple.✅`,
    );
  });

  // Регистрируем аккаунты Бота и Стримера в Twurple
  await authProvider.addUser(
    botTokenRecord.twitchUserId,
    {
      accessToken: botTokenRecord.accessToken,
      refreshToken: botTokenRecord.refreshToken ?? undefined,
      expiresIn: botTokenRecord.expiresIn ?? 0,
      obtainmentTimestamp: Number(botTokenRecord.obtainmentTimestamp),
      scope: [
        "chat:read",
        "chat:edit",
        "moderator:manage:announcements",
        "moderator:read:chatters",
        "moderator:read:followers",
        "channel:bot",
        "user:bot",
      ],
    },
    ["chat"],
  );

  await authProvider.addUser(streamerTokenRecord.twitchUserId, {
    accessToken: streamerTokenRecord.accessToken,
    refreshToken: streamerTokenRecord.refreshToken ?? undefined,
    expiresIn: streamerTokenRecord.expiresIn ?? 0,
    obtainmentTimestamp: Number(streamerTokenRecord.obtainmentTimestamp),
    scope: [
      "bits:read",
      "channel:read:subscriptions",
      "channel:read:redemptions",
      "channel:read:hype_train",
      "channel:manage:redemptions",
    ],
  });

  // Передаем готовые зависимости в запуск Твич-модуля
  await initTwitchModule(authProvider, userService);

  Logger.info(
    "Bootstrap",
    "Application bootstrap completed. Live follow subscription is active! 🚀",
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
