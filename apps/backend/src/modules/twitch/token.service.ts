import { AccessToken } from "@twurple/auth";
import { prisma } from "../../shared/lib/prisma.js";

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
      console.log(
        `[Twitch Auth] Токены для пользователя ${userId} успешно обновлены в базе данных. ✅`,
      );
    } catch (error) {
      console.error(
        "❌ [TokenService] Ошибка при сохранении обновленного токена в БД:",
        error,
      );
      throw error;
    }
  }
}
