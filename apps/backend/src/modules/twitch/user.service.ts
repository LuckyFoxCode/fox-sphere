import { User } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { prisma } from "../../shared/lib/prisma.js";
import { globalEventBus } from "../../shared/services/event-bus.service.js";
import { Logger } from "../../shared/services/logger.service.js";

export class UserService {
  private verifiedUsersCache = new Set<string>();
  private xpCooldownCache = new Map<string, number>();
  private coinsCache = new Map<string, { coins: number; createdAt: number }>();
  private readonly COINS_CACHE_TTL = 10000;

  public async findOrCreateUser(twitchId: string, username: string) {
    try {
      if (!this.verifiedUsersCache.has(twitchId)) {
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
          if (user.username !== username) {
            user = await prisma.user.update({
              where: { twitchId },
              data: {
                username,
              },
            });
          }

          const lastXpTime = user.lastXpAt
            ? new Date(user.lastXpAt).getTime()
            : 0;
          this.xpCooldownCache.set(user.twitchId, lastXpTime);
        }

        this.verifiedUsersCache.add(twitchId);

        return user;
      }
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
      const updatedUser = await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: xpAmount,
          },
          lastXpAt: new Date(now),
        },
      });

      this.xpCooldownCache.set(twitchId, now);
      await this.checkAndUpgradeLevel(updatedUser);
    } catch (error) {
      Logger.error(
        "UserService",
        `Failed to add XP for user: ${twitchId}`,
        error,
      );
    }
  }

  private async checkAndUpgradeLevel(user: User): Promise<void> {
    let currentLvl = user.lvl;
    let hasLeveledUp = false;

    const getXpThresholdForLevel = (lvl: number): number => {
      let totalXpNeeded = 0;

      for (let i = 1; i <= lvl; i++) {
        totalXpNeeded += i * 100;
      }

      return totalXpNeeded;
    };

    let nextLevelThreshold = getXpThresholdForLevel(currentLvl);

    while (user.xp >= nextLevelThreshold) {
      currentLvl++;
      nextLevelThreshold = getXpThresholdForLevel(currentLvl);
      hasLeveledUp = true;
    }

    if (hasLeveledUp) {
      const freshUserData = await prisma.user.update({
        where: { twitchId: user.twitchId },
        data: {
          lvl: currentLvl,
        },
      });
      globalEventBus.emit("user:level-up", {
        userId: freshUserData.twitchId,
        username: freshUserData.username,
        newLevel: currentLvl,
      });
    }
  }

  public async getUsersStats(twitchId: string) {
    return prisma.user.findUnique({
      where: { twitchId },
    });
  }

  public async getTopUsers(limit = 5) {
    return prisma.user.findMany({
      orderBy: {
        xp: "desc",
      },
      take: limit,
    });
  }

  public async getUserCoins(twitchId: string): Promise<number> {
    const now = Date.now();
    const cacheData = this.coinsCache.get(twitchId);

    if (cacheData && now - cacheData.createdAt < this.COINS_CACHE_TTL) {
      return cacheData.coins;
    }

    const user = await prisma.user.findUnique({
      where: { twitchId },
      select: { coins: true },
    });

    const currentCoins = user ? user.coins : 0;

    this.coinsCache.set(twitchId, { coins: currentCoins, createdAt: now });

    return currentCoins;
  }

  public clearCache(): void {
    this.verifiedUsersCache.clear();
    Logger.info("UserService", "User cache cleared successfully🧹");
  }
}
