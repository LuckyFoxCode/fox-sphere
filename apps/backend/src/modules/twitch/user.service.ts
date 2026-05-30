import { AppError } from "../../shared/errors/app-error.js";
import { prisma } from "../../shared/lib/prisma.js";
import { Logger } from "../../shared/services/logger.service.js";

export class UserService {
  private verifiedUsersCache = new Set<string>();
  private xpCooldownCache = new Map<string, number>();

  public async findOrCreateUser(twitchId: string, username: string) {
    if (this.verifiedUsersCache.has(twitchId)) return;

    try {
      let user = await prisma.user.findUnique({
        where: { twitchId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            twitchId,
            username,
          },
        });
      } else {
        const lastXpTime = user.lastXpAt
          ? new Date(user.lastXpAt).getTime()
          : 0;
        this.xpCooldownCache.set(user.twitchId, lastXpTime);
      }

      this.verifiedUsersCache.add(twitchId);

      return user;
    } catch (error) {
      Logger.error(
        "UserService",
        `Failed to find or create user: ${username} (${twitchId})`,
        error,
      );
      throw new AppError("Internal user management error", 500);
    }
  }

  public async addXpForMessage(
    twitchId: string,
    xpAmount: number,
  ): Promise<void> {
    const now = Date.now();
    const lastXpTime = this.xpCooldownCache.get(twitchId) || 0;
    const COOLDOWN_MS = 15 * 1000;

    if (now - lastXpTime < COOLDOWN_MS) return;

    try {
      await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: xpAmount,
          },
          lastXpAt: new Date(now),
        },
      });

      this.xpCooldownCache.set(twitchId, now);
    } catch (error) {
      Logger.error(
        "UserService",
        `Failed to add XP for user: ${twitchId}`,
        error,
      );
    }
  }

  public clearCache(): void {
    this.verifiedUsersCache.clear();
    Logger.info("UserService", "User cache cleared successfully🧹");
  }
}
