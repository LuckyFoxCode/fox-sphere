import {
  AppError,
  config,
  getXpThresholdForLevel,
  Logger,
  prisma,
} from "@fox-sphere/backend-shared";
import type { ChannelUser } from "@fox-sphere/db";
import { HeroRef } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import {
  ensureChannelUser,
  ensureViewer,
  findChannelUser,
  requireChannelUser,
  resolveChannelContext,
} from "../channel";
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

  /**
   * Makes sure this channel has a `ChannelUser` row for this Twitch id, creating it if needed.
   *
   * Returns nothing on purpose. The one thing this method has to guarantee is the side effect:
   * a newly created balance row emits `user:created`, and `HeroService` hangs a hero
   * assignment off that. Both callers ignored the return value, so an earlier version could
   * return one — and did return `undefined` for every viewer already in `verifiedUsers`, since
   * the whole body sat inside `if (!isVerified)`. Nothing caught it because a `find or create`
   * that resolves to nothing invites the exact caller that would have relied on it: `if (!user)
   * throw new NotFoundError()`. Dropping the return removes that trap rather than papering
   * over it.
   */
  public async ensureUserExists(
    twitchId: string,
    username: string,
  ): Promise<void> {
    try {
      const { channelId } = await resolveChannelContext();

      if (this.cache.isVerified(channelId, twitchId)) return;

      const { channelUser, viewer, created } = await ensureChannelUser(
        twitchId,
        username,
      );

      if (created) {
        globalEventBus.emit("user:created", {
          twitchId,
          username: viewer.username,
        });
      } else {
        this.cache.setLastXpAt(
          channelId,
          twitchId,
          new Date(channelUser.lastXpAt).getTime(),
        );
      }

      this.cache.markVerified(channelId, twitchId);
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
      const { channelId } = await resolveChannelContext();
      // The viewer row has to exist before the balance row that points at it, same as in
      // `ensureChannelUser` - a mod can add VIP to somebody who has not typed yet.
      const viewer = await ensureViewer(twitchId, username);

      await prisma.channelUser.upsert({
        where: { channelId_viewerId: { channelId, viewerId: viewer.id } },
        update: { isPermanentVip },
        create: { channelId, viewerId: viewer.id, isPermanentVip },
      });
      Logger.debug("UserService", successMessage);
    } catch (error) {
      Logger.error("UserService", failureMessage, error);
    }
  }

  /**
   * Writes the founder flag - the one status Twitch has no concept of, so a chat command is
   * its only writer, in both directions. Unlike `setPermanentVip` an error here is not
   * swallowed: the command that calls it owns its catch, and a grant that silently failed
   * while the bot answered "done" in chat is the worse outcome.
   *
   * The `ensureViewer` + upsert shape is still the VIP one, deliberately: a founder may well
   * be granted before they have ever typed, and a balance row that does not exist yet is
   * created with the flag rather than rejected by the foreign key.
   */
  public async setFounder(
    twitchId: string,
    username: string,
    isFounder: boolean,
  ): Promise<void> {
    const { channelId } = await resolveChannelContext();
    const viewer = await ensureViewer(twitchId, username);

    await prisma.channelUser.upsert({
      where: { channelId_viewerId: { channelId, viewerId: viewer.id } },
      update: { isFounder },
      create: { channelId, viewerId: viewer.id, isFounder },
    });
    Logger.debug(
      "UserService",
      `${isFounder ? "Granted" : "Revoked"} founder for ${username} (${twitchId})`,
    );
  }

  /**
   * Mirrors the mod and subscriber tags of the message being processed onto this channel's
   * balance row - both ways, so a lost role is unflagged by the viewer's next message and the
   * column never outlives the role it describes.
   *
   * Deliberately not folded into `ensureUserExists`: that method returns early for every
   * viewer already in the `verifiedUsers` cache, so a sync living inside it would freeze on
   * the first message each viewer ever sends. It is also the only writer that must not touch
   * `isFounder` / `isPermanentVip` - those belong to the manual commands alone.
   *
   * Best-effort on purpose: a failure is logged and swallowed, because it runs between
   * `ensureUserExists` and the XP award on the message path, and a dropped XP award would be
   * a much worse price for a stale role flag. The `update` is issued only when the row
   * actually disagrees with the tags, so an unchanged message writes nothing at all.
   */
  public async syncChatRoles(
    twitchId: string,
    roles: { isMod: boolean; isSubscriber: boolean },
  ): Promise<void> {
    try {
      const channelUser = await findChannelUser(twitchId);
      if (!channelUser) return;

      const changed: { isMod?: boolean; isSubscriber?: boolean } = {};
      if (channelUser.isMod !== roles.isMod) changed.isMod = roles.isMod;
      if (channelUser.isSubscriber !== roles.isSubscriber)
        changed.isSubscriber = roles.isSubscriber;
      if (Object.keys(changed).length === 0) return;

      await prisma.channelUser.update({
        where: { id: channelUser.id },
        data: changed,
      });
    } catch (error) {
      Logger.error(
        "UserService",
        `Failed to sync chat roles for ${twitchId}`,
        error,
      );
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
      const { channelId } = await resolveChannelContext();
      const channelUser = await findChannelUser(twitchId);

      if (!channelUser) return;

      const lastLotteryTime = this.cache.getLastLotteryXpAt(channelId, twitchId);

      if (now - lastLotteryTime >= COOLDOWNS.XP_LOTTERY_COOLDOWN) {
        // The balance row, not its id. `processMessageXp` writes the lottery's three columns on
        // whatever row it is handed, and handing it a number is how weekly XP became a no-op
        // for most viewers: `User.id` and `ChannelUser.id` are unrelated autoincrement
        // sequences, so the id resolved against no one - or against an unrelated legacy viewer
        // who happened to hold that number.
        await this.lotteryService.processMessageXp(
          channelUser,
          Number(XP_REWARDS.LOTTERY),
        );
        this.cache.setLastLotteryXpAt(channelId, twitchId, now);
      }

      const lastXpTime = this.cache.getLastXpAt(channelId, twitchId);
      if (now - lastXpTime < COOLDOWNS.XP_MESSAGE_COOLDOWN) return;

      // Both flags are columns on `ChannelUser` now. They used to be `User.isPermanentVip` and
      // `UserLottery.isLuckyVip`, which is why this was a two-source read.
      const isVip = channelUser.isLuckyVip || channelUser.isPermanentVip;
      // Two independent bonuses, added rather than chosen: a founder needs no VIP to get
      // theirs, and a founder who is also a VIP gets both.
      const vipBonus = isVip ? XP_REWARDS.VIP_BONUS : 0;
      const founderBonus = channelUser.isFounder ? XP_REWARDS.FOUNDER_BONUS : 0;
      const baseXp = xpAmount + vipBonus + founderBonus;
      const activeBoost = await this.streamService.getActiveXpBoost();
      const finalXpAmount = baseXp * (activeBoost?.multiplier ?? 1);

      const updatedUser = await prisma.channelUser.update({
        where: { id: channelUser.id },
        data: {
          xp: {
            increment: finalXpAmount,
          },
          lastXpAt: new Date(now),
        },
      });

      this.cache.setLastXpAt(channelId, twitchId, now);
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

  private async checkAndUpgradeLevel(channelUser: ChannelUser): Promise<void> {
    let currentLvl = channelUser.lvl;
    let hasLeveledUp = false;

    let nextLevelThreshold = getXpThresholdForLevel(currentLvl, 100);

    while (channelUser.xp >= nextLevelThreshold) {
      currentLvl++;
      nextLevelThreshold = getXpThresholdForLevel(currentLvl, 100);
      hasLeveledUp = true;
    }

    if (hasLeveledUp) {
      const freshChannelUser = await prisma.channelUser.update({
        where: { id: channelUser.id },
        data: {
          lvl: currentLvl,
        },
        select: {
          viewer: {
            select: {
              twitchId: true,
              username: true,
            },
          },
          hero: {
            select: {
              heroId: true,
            },
          },
        },
      });

      // The overlay keys a viewer's level-up by Twitch id, not by a database id, so the
      // payload is unchanged - it just reaches `twitchId` through `Viewer` now.
      globalEventBus.emit("user:level-up", {
        userId: freshChannelUser.viewer.twitchId,
        username: freshChannelUser.viewer.username,
        newLevel: currentLvl,
        hero: freshChannelUser.hero
          ? { heroId: freshChannelUser.hero.heroId }
          : undefined,
      });
    }
  }

  public async getUsersStats(twitchId: string) {
    return await findChannelUser(twitchId);
  }

  public async getTopUsers() {
    const { channelId } = await resolveChannelContext();

    const rows = await prisma.channelUser.findMany({
      where: { channelId },
      orderBy: {
        xp: "desc",
      },
      select: {
        lvl: true,
        xp: true,
        viewer: { select: { username: true } },
      },
    });

    // Flattened, because the caller's only need for a row beyond the balance is the name to
    // print - and `username` is a `Viewer` column now, so leaving it nested would make every
    // consumer reach through `viewer`.
    return rows.map((row) => ({
      username: row.viewer.username,
      lvl: row.lvl,
      xp: row.xp,
    }));
  }

  public async addCoins(twitchId: string, amount: number): Promise<void> {
    const channelUser = await requireChannelUser(twitchId);

    await prisma.channelUser.update({
      where: { id: channelUser.id },
      data: {
        coins: {
          increment: amount,
        },
      },
    });

    await this.invalidateCoins(twitchId);

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
    const channelUser = await findChannelUser(twitchId);

    if (!channelUser) {
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
        await tx.channelUser.update({
          where: { id: channelUser.id },
          data: { coins: { increment: pkg.coinsAwarded } },
        });

        await tx.coinHistory.create({
          data: {
            // `channelId` read off the balance row rather than off the context: the history
            // row and the coins it explains must be filed under the same channel, and taking
            // it from the row makes that impossible to get wrong.
            channelId: channelUser.channelId,
            channelUserId: channelUser.id,
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

    await this.invalidateCoins(twitchId);

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
      const channelUser = await requireChannelUser(twitchId);

      const updatedUser = await prisma.channelUser.update({
        where: { id: channelUser.id },
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
    const { channelId } = await resolveChannelContext();
    const now = Date.now();
    const cachedCoins = this.cache.getCoins(channelId, twitchId, now);

    if (cachedCoins !== undefined) return cachedCoins;

    const channelUser = await findChannelUser(twitchId);

    const currentCoins = channelUser ? channelUser.coins : 0;

    this.cache.setCoins(channelId, twitchId, currentCoins, now);

    return currentCoins;
  }

  // Async because the cache key carries the channel, and the channel is only known once
  // `resolveChannelContext` has answered. Both call sites are already in async functions.
  public async invalidateCoins(twitchId: string): Promise<void> {
    const { channelId } = await resolveChannelContext();
    this.cache.invalidateCoins(channelId, twitchId);
  }

  public async invalidateHero(twitchId: string): Promise<void> {
    const { channelId } = await resolveChannelContext();
    this.cache.invalidateHero(channelId, twitchId);
  }

  public async getUserWithHero(
    twitchId: string,
  ): Promise<{
    lvl: number;
    isPermanentVip: boolean;
    isFounder: boolean;
    hero: HeroRef;
  } | null> {
    const { channelId } = await resolveChannelContext();
    const channelUser = await findChannelUser(twitchId);

    if (!channelUser) return null;

    const now = Date.now();
    const cached = this.cache.getHero(channelId, twitchId, now);

    const heroId =
      cached ??
      (await this.heroService.ensureUserHasHero(
        channelUser.id,
        channelUser.channelId,
      ));

    this.cache.setHero(channelId, twitchId, heroId, now);

    return {
      lvl: channelUser.lvl,
      isPermanentVip: channelUser.isPermanentVip,
      isFounder: channelUser.isFounder,
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