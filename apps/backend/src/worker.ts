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

async function bootstrap() {
  Logger.info("Bootstrap", "Initializing Twitch worker application...⚙️");

  const botId = config.twitch.botId;
  const streamerId = config.twitch.userId;

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
    where: { twitchUserId: streamerId },
  });

  if (!existingStreamerToken) {
    await prisma.twitchToken.create({
      data: {
        id: crypto.randomUUID(),
        twitchUserId: streamerId,
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

  const tokenService = new TokenService();
  const userService = new UserService();

  const botTokenRecord = await tokenService.getToken(botId);
  const streamerTokenRecord = await tokenService.getToken(streamerId);

  if (!botTokenRecord || !streamerTokenRecord) {
    throw new AppError(
      "Failed to initialize Twitch tokens (Bot or Streamer) from database.",
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

  await eventSubClient.subscribeToRewards(streamerId, async (data) => {
    globalEventBus.emit("twitch:reward-redeem", {
      userId: data.userId,
      username: data.userDisplayName,
      rewardTitle: data.rewardTitle,
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
