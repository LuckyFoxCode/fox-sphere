import { RefreshingAuthProvider } from "@twurple/auth";
import { randomUUID } from "crypto";
import { ChatbotService } from "./modules/twitch/chatbot.service.js";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client.js";
import { TokenService } from "./modules/twitch/token.service.js";
import { UserService } from "./modules/twitch/user.service.js";
import { config } from "./shared/config/index.js";
import { prisma } from "./shared/lib/prisma.js";

async function bootstrap() {
  console.log("Инициализация воркера...");

  const botId = config.twitch.botId;
  const streamerId = config.twitch.userId;

  const existingToken = await prisma.twitchToken.findUnique({
    where: { twitchUserId: botId },
  });

  if (!existingToken) {
    await prisma.twitchToken.create({
      data: {
        id: randomUUID(),
        twitchUserId: botId,
        accessToken: config.twitch.botAccessToken,
        refreshToken: config.twitch.botRefreshToken,
        expiresIn: 14400,
        obtainmentTimestamp: Date.now(),
      },
    });
    console.log("[Prisma] Создана новая запись для токенов бота. 🎉");
  }

  const tokenService = new TokenService();
  const userService = new UserService();

  const tokenRecord = await tokenService.getToken(botId);

  if (!tokenRecord) {
    throw new Error("Не удалось инициализировать токены в БД.");
  }

  console.log({
    botId,
    tokenUserId: tokenRecord?.twitchUserId,
  });

  const authProvider = new RefreshingAuthProvider({
    clientId: config.twitch.clientId,
    clientSecret: config.twitch.clientSecret,
  });

  authProvider.onRefresh(async (userId, tokenData) => {
    await tokenService.updateToken(userId, tokenData);
    console.log(
      `[Twitch Auth] Токены для ${userId} обновлены через TokenService. ✅`,
    );
  });

  await authProvider.addUser(
    tokenRecord.twitchUserId,
    {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken ?? undefined,
      expiresIn: tokenRecord.expiresIn ?? 0,
      obtainmentTimestamp: Number(tokenRecord.obtainmentTimestamp),
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

  const chatbotService = new ChatbotService(authProvider, userService);
  await chatbotService.start();

  const eventSubClient = new TwitchEventSubClient(authProvider);
  await eventSubClient.start();

  await eventSubClient.subscribeToFollows(streamerId, botId, async (event) => {
    try {
      const welcomeMessage = `🎉 Спасибо за фоллов, @${event.userDisplayName}! Добро пожаловать в семью!`;

      await chatbotService.sendMessage(
        config.twitch.channelName,
        welcomeMessage,
      );
      console.log(
        `[Worker] Приветствие для ${event.userDisplayName} успешно отправлено в чат.`,
      );
    } catch (error) {
      console.error(
        "❌ [Worker] Не удалось отправить сообщение о фоллове в чат:",
        error,
      );
    }
  });

  console.log("✅ Follow subscription active");
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка при запуске воркера:", err);
  process.exit(1);
});
