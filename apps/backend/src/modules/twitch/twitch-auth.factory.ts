import { RefreshingAuthProvider } from "@twurple/auth";
import { config } from "../../shared/config";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/lib";
import { Logger } from "../../shared/services";
import { TokenService } from "./token.service";

export class TwitchAuthFactory {
  static async create(
    tokenService: TokenService,
  ): Promise<RefreshingAuthProvider> {
    const botId = config.twitch.botId;
    const userId = config.twitch.userId;

    // 1. Сидирование токенов, если их нет
    await this.seedTokensIfNeeded(botId, userId);

    const botTokenRecord = await tokenService.getToken(botId);
    const streamerTokenRecord = await tokenService.getToken(userId);

    if (!botTokenRecord || !streamerTokenRecord) {
      throw new AppError(
        "Failed to initialize Twitch tokens from database.",
        500,
      );
    }

    // 2. Инициализация провайдера
    const authProvider = new RefreshingAuthProvider({
      clientId: config.twitch.clientId,
      clientSecret: config.twitch.clientSecret,
    });

    authProvider.onRefresh(async (refreshedUserId, tokenData) => {
      await tokenService.updateToken(refreshedUserId, tokenData);
      Logger.debug(
        "Bootstrap",
        `Tokens for user ${refreshedUserId} automatically refreshed by Twurple.✅`,
      );
    });

    // 3. Регистрация пользователей
    await authProvider.addUser(
      botId,
      {
        accessToken: botTokenRecord.accessToken,
        refreshToken: botTokenRecord.refreshToken ?? undefined,
        expiresIn: botTokenRecord.expiresIn ?? 0,
        obtainmentTimestamp: Number(botTokenRecord.obtainmentTimestamp),
        scope: [
          "chat:read", // Read chat messages
          "chat:edit", // Send chat messages
          "moderator:manage:banned_users", // Ban/timeout users (Games & Casino moderation)
          "moderator:manage:announcements", // Send colorful highlight announcements to chat
          "moderator:manage:chat_messages", // Delete single spam messages or casino flood
          "moderator:read:chatters", // Get list of active chatters in real-time
          "moderator:manage:shoutouts", // Send shoutouts (!so command)
          "moderator:read:followers", // Check follow status and list of followers
          "channel:bot", // Modern Twitch scope for bot designation
          "user:bot", // Modern Twitch scope for user designation
        ],
      },
      ["chat"],
    );

    await authProvider.addUser(userId, {
      accessToken: streamerTokenRecord.accessToken,
      refreshToken: streamerTokenRecord.refreshToken ?? undefined,
      expiresIn: streamerTokenRecord.expiresIn ?? 0,
      obtainmentTimestamp: Number(streamerTokenRecord.obtainmentTimestamp),
      scope: [
        "bits:read", // Track cheer events and Bits donations
        "channel:read:subscriptions", // Track tier-1/2/3 subs and sub gifts
        "moderation:read", // Read moderators/VIPs lists (VIP lottery check)
        "channel:manage:broadcast", // Change stream title and category via commands
        "channel:read:redemptions", // Track Twitch channel points rewards redemption
        "channel:read:hype_train", // Track Hype Train events
        "channel:manage:redemptions", // Manage channel points status (approve/refund)
        "channel:manage:polls", // Create and manage chat polls
        "channel:manage:predictions", // Create predictions (Casino/Games betting system)
        "channel:manage:moderators", // Manage channel moderators (for future rewards)
        "channel:manage:vips", // Add and remove VIP statuses (VIP lottery core)
      ],
    });

    return authProvider;
  }

  private static async seedTokensIfNeeded(
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
        "TwitchAuthFactory",
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
}
