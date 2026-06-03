import { AccessToken } from "@twurple/auth";
import { AppError } from "../../shared/errors/app-error";
import { prisma } from "../../shared/lib/prisma";
import { Logger } from "../../shared/services/logger.service";

export class TokenService {
  public async getToken(userId: string) {
    return prisma.twitchToken.findUnique({
      where: { twitchUserId: userId },
    });
  }

  public async updateToken(
    userId: string,
    tokenData: AccessToken,
  ): Promise<void> {
    try {
      await prisma.twitchToken.update({
        where: { twitchUserId: userId },
        data: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken || undefined,
          expiresIn: tokenData.expiresIn ?? 0,
          obtainmentTimestamp: tokenData.obtainmentTimestamp,
        },
      });
      Logger.debug(
        "TokenService",
        `Tokens for user ${userId} successfully updated in database.`,
      );
    } catch (error) {
      Logger.error(
        "TokenService",
        `Failed to update tokens for user: ${userId}`,
        error,
      );
      throw new AppError("Database token update failed", 500);
    }
  }
}
