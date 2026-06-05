import { RefreshingAuthProvider } from "@twurple/auth";
import { config } from "../../shared/config";
import { AppError } from "../../shared/errors/app-error";
import { prisma } from "../../shared/lib/prisma";
import { Logger } from "../../shared/services/logger.service";
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
          "chat:read",
          "chat:edit",
          "moderator:manage:announcements",
          "moderator:read:chatters",
          "moderator:manage:shoutouts",
          "moderator:read:followers",
          "channel:bot",
          "user:bot",
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
        "bits:read",
        "channel:read:subscriptions",
        "channel:read:redemptions",
        "channel:read:hype_train",
        "channel:manage:redemptions",
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
