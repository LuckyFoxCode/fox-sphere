import { User } from "../../generated/prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";
import { LotteryService } from "../lottery";
import { COOLDOWNS, XP_REWARDS } from "./user.constants";

export class UserService {
  private verifiedUsersCache = new Set<string>();
  private xpCooldownCache = new Map<string, number>();
  private lotteryCooldownCache = new Map<string, number>();
  private coinsCache = new Map<string, { coins: number; createdAt: number }>();

  constructor(private lotteryService: LotteryService) {}

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

          globalEventBus.emit("user:created", {
            twitchId: user.twitchId,
            username: user.username,
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

  public async addVipToDb(twitchId: string, username: string): Promise<void> {
    try {
      await prisma.user.upsert({
        where: {
          twitchId: twitchId,
        },
        update: {
          isPermanentVip: true,
          username,
        },
        create: {
          isPermanentVip: true,
          twitchId: twitchId,
          username,
        },
      });
      Logger.debug(
        "UserService",
        `✩°｡🧸𓏲⋆.🧺𖦹 ₊˚ Successfully added permanent VIP ${username} in Prisma.`,
      );
    } catch (error) {
      Logger.error(
        "UserService",
        `𓏲๋࣭࣪˖🪼.ᐟ Failed to add VIP for user: ${twitchId}`,
        error,
      );
    }
  }

  public async removeVipFromDb(
    twitchId: string,
    username: string,
  ): Promise<void> {
    try {
      await prisma.user.upsert({
        where: {
          twitchId: twitchId,
        },
        update: {
          isPermanentVip: false,
          username,
        },
        create: {
          isPermanentVip: false,
          twitchId,
          username,
        },
      });
      Logger.debug(
        "UserService",
        `✩°｡🧸𓏲⋆.🧺𖦹 ₊˚ Successfully remove permanent VIP ${username} in Prisma.`,
      );
    } catch (error) {
      Logger.error(
        "UserService",
        `𓏲๋࣭࣪˖🪼.ᐟ Failed to remove VIP for user: ${twitchId}`,
        error,
      );
    }
  }

  public async addXpForMessage(
    twitchId: string,
    xpAmount: number,
  ): Promise<void> {
    const now = Date.now();

    try {
      const userWithLottery = await prisma.user.findUnique({
        where: { twitchId },
        select: {
          id: true,
          isPermanentVip: true,
          lotteryContext: {
            select: { isLuckyVip: true },
          },
        },
      });

      if (!userWithLottery) return;

      const lastLotteryTime = this.lotteryCooldownCache.get(twitchId) || 0;

      if (now - lastLotteryTime >= COOLDOWNS.XP_LOTTERY_COOLDOWN) {
        await this.lotteryService.processMessageXp(
          userWithLottery.id,
          Number(XP_REWARDS.LOTTERY),
        );
        this.lotteryCooldownCache.set(twitchId, now);
      }

      const lastXpTime = this.xpCooldownCache.get(twitchId) || 0;
      if (now - lastXpTime < COOLDOWNS.XP_MESSAGE_COOLDOWN) return;

      const isVip =
        userWithLottery.lotteryContext?.isLuckyVip ||
        userWithLottery.isPermanentVip;
      const finalXpAmount = isVip ? xpAmount + XP_REWARDS.LOTTERY : xpAmount;

      const updatedUser = await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: finalXpAmount,
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

  public async triggerLottery(): Promise<boolean> {
    return await this.lotteryService.runWeeklyLottery();
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

  public async addCoins(twitchId: string, amount: number): Promise<void> {
    await prisma.user.update({
      where: { twitchId },
      data: {
        coins: {
          increment: amount,
        },
      },
    });

    this.coinsCache.delete(twitchId);

    Logger.debug(
      "UserService",
      `Successfully added ${amount} coins to user: ${twitchId} and cleared cache.`,
    );
  }

  public async getUserCoins(twitchId: string): Promise<number> {
    const now = Date.now();
    const cacheData = this.coinsCache.get(twitchId);

    if (cacheData && now - cacheData.createdAt < COOLDOWNS.COINS_CACHE_TTL) {
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
