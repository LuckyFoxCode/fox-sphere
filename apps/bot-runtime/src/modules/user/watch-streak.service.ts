import { Logger, prisma } from "@fox-sphere/backend-shared";
import type { ChannelUser } from "@fox-sphere/db";
import { findChannelUser } from "../channel";
import { isWatchStreakRewardLevel } from "./user.constants";

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type WatchStreakAward = {
  xpAwarded: number;
  coinsAwarded: number;
  isRepeat: boolean;
};

export class WatchStreakService {
  public async award(
    twitchId: string,
    streakValue: number,
  ): Promise<WatchStreakAward | null> {
    if (!isWatchStreakRewardLevel(streakValue)) return null;

    try {
      const channelUser = await findChannelUser(twitchId);
      if (!channelUser) return null;

      const existing = await prisma.watchStreak.findUnique({
        where: {
          channelUserId_streakValue: {
            channelUserId: channelUser.id,
            streakValue,
          },
        },
      });

      if (existing) {
        const halfXp = Math.floor((streakValue * 7) / 2);
        const halfCoins = Math.floor((streakValue * 100) / 2);

        await this.awardRewards(channelUser, halfXp, halfCoins, streakValue);

        Logger.debug(
          "UserService",
          `Watch streak ${streakValue} already awarded for ${twitchId} — repeat, half reward`,
        );

        return { xpAwarded: halfXp, coinsAwarded: halfCoins, isRepeat: true };
      }

      const xpAwarded = streakValue * 7;
      const coinsAwarded = streakValue * 100;

      await prisma.$transaction(async (tx) => {
        await tx.watchStreak.create({
          data: {
            channelId: channelUser.channelId,
            channelUserId: channelUser.id,
            streakValue,
          },
        });

        await this.awardRewards(
          channelUser,
          xpAwarded,
          coinsAwarded,
          streakValue,
          tx,
        );
      });

      return { xpAwarded, coinsAwarded, isRepeat: false };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        Logger.info(
          "UserService",
          `Watch streak ${streakValue} already awarded for ${twitchId} — repeat, widget without rewards`,
        );
        return { xpAwarded: 0, coinsAwarded: 0, isRepeat: true };
      }

      Logger.error(
        "UserService",
        `Failed to award watch streak for ${twitchId}`,
        error,
      );

      return null;
    }
  }

  /**
   * Takes the balance row rather than a Twitch id, because every write below has to name the
   * same `channelId` and `channelUserId` pair - and taking both off one row is what makes that
   * impossible to get wrong. Passing `twitchId` separately is what this used to do, and it is
   * how the history rows ended up keyed by a different identity than the coins they explain.
   */
  private async awardRewards(
    channelUser: ChannelUser,
    xpAwarded: number,
    coinsAwarded: number,
    streakValue: number,
    tx?: TransactionClient,
  ): Promise<void> {
    const run = async (t: TransactionClient) => {
      await t.channelUser.update({
        where: { id: channelUser.id },
        data: {
          xp: { increment: xpAwarded },
          coins: { increment: coinsAwarded },
        },
      });

      await t.xpHistory.create({
        data: {
          channelId: channelUser.channelId,
          channelUserId: channelUser.id,
          amount: xpAwarded,
          reason: "WATCH_STREAK",
          details: `Watch streak: ${streakValue} streams`,
        },
      });

      await t.coinHistory.create({
        data: {
          channelId: channelUser.channelId,
          channelUserId: channelUser.id,
          amount: coinsAwarded,
          reason: "WATCH_STREAK",
          details: `Watch streak: ${streakValue} streams`,
        },
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await prisma.$transaction(run);
    }
  }
}