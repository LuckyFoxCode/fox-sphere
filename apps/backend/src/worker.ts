import { RefreshingAuthProvider } from "@twurple/auth";
import { randomUUID } from "crypto";
import { ChatbotService } from "./modules/twitch/chatbot.service.js";
import { TwitchEventSubClient } from "./modules/twitch/eventsub.client.js";
import { TokenService } from "./modules/twitch/token.service.js";
import { UserService } from "./modules/twitch/user.service.js";
import { config } from "./shared/config/index.js";
import { AppError } from "./shared/errors/app-error.js";
import { prisma } from "./shared/lib/prisma.js";
import { globalEventBus } from "./shared/services/event-bus.service.js";
import { Logger } from "./shared/services/logger.service.js";

async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

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
    Logger.info(
      "Bootstrap",
      "Initial bot tokens successfully seeded into the database.🎉",
    );
  }

  const tokenService = new TokenService();
  const userService = new UserService();

  const tokenRecord = await tokenService.getToken(botId);

  if (!tokenRecord) {
    throw new AppError(
      "Failed to initialize Twitch tokens from database.",
      500,
    );
  }

  const authProvider = new RefreshingAuthProvider({
    clientId: config.twitch.clientId,
    clientSecret: config.twitch.clientSecret,
  });

  authProvider.onRefresh(async (userId, tokenData) => {
    await tokenService.updateToken(userId, tokenData);
    Logger.debug(
      "Bootstrap",
      `Tokens for user ${userId} automatically refreshed by Twurple.✅`,
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
    globalEventBus.emit("twitch:follow", {
      userId: event.userId,
      username: event.userDisplayName,
    });
  });
  Logger.info(
    "Bootstrap",
    "Application bootstrap completed. Live follow subscription is active! 🚀",
  );
}

bootstrap().catch((err) => {
  Logger.error(
    "Bootstrap",
    "Critical uncaught error during worker startup process",
    err,
  );
  process.exit(1);
});
