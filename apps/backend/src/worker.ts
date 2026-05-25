import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatbotService } from "./modules/twitch/chatbot.service.js";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client.js";
import { TokenService } from "./modules/twitch/token.service.js";
import { config } from "./shared/config/index.js";
import { prisma } from "./shared/lib/prisma.js";

async function bootstrap() {
  console.log("Инициализация воркера...");

  const tokenService = new TokenService();

  const tokenRecord = await tokenService.getToken();

  if (!tokenRecord) {
    throw new Error("Не удалось инициализировать токены в БД.");
  }

  await prisma.twitchToken.update({
    where: {
      twitchUserId: tokenRecord.twitchUserId,
    },
    data: {
      accessToken: config.twitch.botAccessToken, // новый access token
      refreshToken: config.twitch.botRefreshToken,
      expiresIn: 14400,
      obtainmentTimestamp: Date.now(),
    },
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
      scope: ["chat:read", "chat:edit", "moderator:read:followers"],
    },
    ["chat"],
  );

  const chatbotService = new ChatbotService(authProvider);
  await chatbotService.start();

  const eventSubClient = new TwitchEventSubClient(authProvider);
  await eventSubClient.start();

  eventSubClient.subscribeToFollows(tokenRecord.twitchUserId, async (event) => {
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
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка при запуске воркера:", err);
  process.exit(1);
});
