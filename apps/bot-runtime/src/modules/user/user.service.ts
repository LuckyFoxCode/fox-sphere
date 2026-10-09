import {
  AppError,
  config,
  getXpThresholdForLevel,
  Logger,
  prisma,
} from "@fox-sphere/backend-shared";
import type { User } from "@fox-sphere/db";
import { HeroRef } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import { HeroService } from "../hero";
import { LotteryService } from "../lottery";
import { StreamService } from "../stream";
import type { ExchangePackage } from "../twitch/twitch.constants";
import { COOLDOWNS, XP_REWARDS } from "./user.constants";
import { UserCache } from "./user-cache";
import type { WatchStreakAward } from "./watch-streak.service";
import { WatchStreakService } from "./watch-streak.service";

type ExchangeChannelPointsResult =
  | { status: "credited"; awarded: number }
  | { status: "duplicate" }
  | { status: "user-not-found" };

export class UserService {
  constructor(
    private lotteryService: LotteryService,
    private streamService: StreamService,
    private heroService: HeroService,
    private cache: UserCache = new UserCache(),
    private watchStreakService: WatchStreakService = new WatchStreakService(),
  ) {}

  public async findOrCreateUser(twitchId: string, username: string) {
    try {
      if (!this.cache.isVerified(twitchId)) {
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
          this.cache.setLastXpAt(user.twitchId, lastXpTime);
        }

        this.cache.markVerified(twitchId);

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
    await this.setPermanentVip(
      twitchId,
      username,
      true,
      `✩°｡🧸𓏲⋆.🧺𖦹 ₊˚ Successfully added permanent VIP ${username} in Prisma.`,
      `𓏲๋࣭࣪˖🪼.ᐟ Failed to add VIP for user: ${twitchId}`,
    );
  }

  public async removeVipFromDb(
    twitchId: string,
    username: string,
  ): Promise<void> {
    await this.setPermanentVip(
      twitchId,
      username,
      false,
      `✩°｡🧸𓏲⋆.🧺𖦹 ₊˚ Successfully remove permanent VIP ${username} in Prisma.`,
      `𓏲๋࣭࣪˖🪼.ᐟ Failed to remove VIP for user: ${twitchId}`,
    );
  }

  private async setPermanentVip(
    twitchId: string,
    username: string,
    isPermanentVip: boolean,
    successMessage: string,
    failureMessage: string,
  ): Promise<void> {
    try {
      await prisma.user.upsert({
        where: {
          twitchId: twitchId,
        },
        update: {
          isPermanentVip,
          username,
        },
        create: {
          isPermanentVip,
          twitchId: twitchId,
          username,
        },
      });
      Logger.debug("UserService", successMessage);
    } catch (error) {
      Logger.error("UserService", failureMessage, error);
    }
  }

  public async addXpForMessage(
    twitchId: string,
    xpAmount: number,
  ): Promise<void> {
    if (twitchId === config.twitch.botId || twitchId === config.twitch.userId)
      return;

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

      const lastLotteryTime = this.cache.getLastLotteryXpAt(twitchId);

      if (now - lastLotteryTime >= COOLDOWNS.XP_LOTTERY_COOLDOWN) {
        await this.lotteryService.processMessageXp(
          userWithLottery.id,
          Number(XP_REWARDS.LOTTERY),
        );
        this.cache.setLastLotteryXpAt(twitchId, now);
      }

      const lastXpTime = this.cache.getLastXpAt(twitchId);
      if (now - lastXpTime < COOLDOWNS.XP_MESSAGE_COOLDOWN) return;

      const isVip =
        userWithLottery.lotteryContext?.isLuckyVip ||
        userWithLottery.isPermanentVip;
      const baseXp = isVip ? xpAmount + XP_REWARDS.VIP_BONUS : xpAmount;
      const activeBoost = await this.streamService.getActiveXpBoost();
      const finalXpAmount = baseXp * (activeBoost?.multiplier ?? 1);

      const updatedUser = await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: finalXpAmount,
          },
          lastXpAt: new Date(now),
        },
      });

      this.cache.setLastXpAt(twitchId, now);
      await this.checkAndUpgradeLevel(updatedUser);
      await this.streamService.updateStreamXp(finalXpAmount);
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

    let nextLevelThreshold = getXpThresholdForLevel(currentLvl, 100);

    while (user.xp >= nextLevelThreshold) {
      currentLvl++;
      nextLevelThreshold = getXpThresholdForLevel(currentLvl, 100);
      hasLeveledUp = true;
    }

    if (hasLeveledUp) {
      const freshUserData = await prisma.user.update({
        where: { twitchId: user.twitchId },
        data: {
          lvl: currentLvl,
        },
        select: {
          twitchId: true,
          username: true,
          hero: {
            select: {
              heroId: true,
            },
          },
        },
      });

      globalEventBus.emit("user:level-up", {
        userId: freshUserData.twitchId,
        username: freshUserData.username,
        newLevel: currentLvl,
        hero: freshUserData.hero
          ? { heroId: freshUserData.hero.heroId }
          : undefined,
      });
    }
  }

  public async getUsersStats(twitchId: string) {
    return prisma.user.findUnique({
      where: { twitchId },
    });
  }

  public async getTopUsers() {
    return prisma.user.findMany({
      orderBy: {
        xp: "desc",
      },
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

    this.cache.invalidateCoins(twitchId);

    Logger.debug(
      "UserService",
      `Successfully added ${amount} coins to user: ${twitchId} and cleared cache.`,
    );
  }

  public async exchangeChannelPoints(
    twitchId: string,
    redemptionId: string,
    pkg: ExchangePackage,
  ): Promise<ExchangeChannelPointsResult> {
    const user = await prisma.user.findUnique({
      where: { twitchId },
      select: { id: true },
    });

    if (!user) {
      Logger.warn(
        "UserService",
        `Coin exchange skipped — user not found: ${twitchId} (redemption ${redemptionId})`,
      );
      return { status: "user-not-found" };
    }

    const existing = await prisma.coinHistory.findUnique({
      where: { redemptionId },
      select: { id: true },
    });

    if (existing) {
      Logger.debug(
        "UserService",
        `Coin exchange duplicate redemption skipped: ${redemptionId}`,
      );
      return { status: "duplicate" };
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { twitchId },
          data: { coins: { increment: pkg.coinsAwarded } },
        });

        await tx.coinHistory.create({
          data: {
            userId: user.id,
            amount: pkg.coinsAwarded,
            reason: "CHANGE_POINTS",
            details: this.buildExchangeDetails(pkg),
            redemptionId,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        Logger.debug(
          "UserService",
          `Coin exchange duplicate redemption (race) skipped: ${redemptionId}`,
        );
        return { status: "duplicate" };
      }
      throw error;
    }

    this.cache.invalidateCoins(twitchId);

    Logger.debug(
      "UserService",
      `Coin exchange: +${pkg.coinsAwarded} coins to ${twitchId} (${pkg.rewardTitle}, redemption ${redemptionId})`,
    );

    return { status: "credited", awarded: pkg.coinsAwarded };
  }

  private buildExchangeDetails(pkg: ExchangePackage): string {
    const bonus = pkg.coinsAwarded - pkg.channelPointsCost;
    const bonusPart = bonus > 0 ? ` (+${pkg.bonusPct}% bonus = ${bonus})` : "";
    return `${pkg.rewardTitle}: ${pkg.channelPointsCost} channel points → ${pkg.coinsAwarded} coins${bonusPart}`;
  }

  public async addXp(twitchId: string, xpAmount: number): Promise<void> {
    try {
      const updatedUser = await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: xpAmount,
          },
        },
      });

      await this.checkAndUpgradeLevel(updatedUser);
      await this.streamService.updateStreamXp(xpAmount);
    } catch (error) {
      Logger.error(
        "UserService",
        `Failed to add XP for user: ${twitchId}`,
        error,
      );
    }
  }

  public async getUserCoins(twitchId: string): Promise<number> {
    const now = Date.now();
    const cachedCoins = this.cache.getCoins(twitchId, now);

    if (cachedCoins !== undefined) return cachedCoins;

    const user = await prisma.user.findUnique({
      where: { twitchId },
      select: { coins: true },
    });

    const currentCoins = user ? user.coins : 0;

    this.cache.setCoins(twitchId, currentCoins, now);

    return currentCoins;
  }

  public invalidateCoins(twitchId: string): void {
    this.cache.invalidateCoins(twitchId);
  }

  public invalidateHero(twitchId: string): void {
    this.cache.invalidateHero(twitchId);
  }

  public async getUserWithHero(
    twitchId: string,
  ): Promise<{
    lvl: number;
    isPermanentVip: boolean;
    isFounder: boolean;
    hero: HeroRef;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { twitchId },
      select: {
        id: true,
        lvl: true,
        isPermanentVip: true,
        isFounder: true,
      },
    });

    if (!user) return null;

    const now = Date.now();
    const cached = this.cache.getHero(twitchId, now);

    const heroId =
      cached ?? (await this.heroService.ensureUserHasHero(user.id));

    this.cache.setHero(twitchId, heroId, now);

    return {
      lvl: user.lvl,
      isPermanentVip: user.isPermanentVip,
      isFounder: user.isFounder,
      hero: { heroId },
    };
  }

  public async awardWatchStreak(
    twitchId: string,
    streakValue: number,
  ): Promise<WatchStreakAward | null> {
    return await this.watchStreakService.award(twitchId, streakValue);
  }

  public clearCache(): void {
    this.cache.clearAll();
    Logger.info("UserService", "User cache cleared successfully🧹");
  }
}
