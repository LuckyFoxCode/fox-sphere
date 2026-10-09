import { Logger, prisma } from "@fox-sphere/backend-shared";
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
      const user = await prisma.user.findUnique({ where: { twitchId } });
      if (!user) return null;

      const existing = await prisma.watchStreak.findUnique({
        where: {
          userId_streakValue: { userId: user.id, streakValue },
        },
      });

      if (existing) {
        const halfXp = Math.floor((streakValue * 7) / 2);
        const halfCoins = Math.floor((streakValue * 100) / 2);

        await this.awardRewards(
          twitchId,
          user.id,
          halfXp,
          halfCoins,
          streakValue,
        );

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
          data: { userId: user.id, streakValue },
        });

        await this.awardRewards(
          twitchId,
          user.id,
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

  private async awardRewards(
    twitchId: string,
    userId: number,
    xpAwarded: number,
    coinsAwarded: number,
    streakValue: number,
    tx?: TransactionClient,
  ): Promise<void> {
    const run = async (t: TransactionClient) => {
      await t.user.update({
        where: { twitchId },
        data: {
          xp: { increment: xpAwarded },
          coins: { increment: coinsAwarded },
        },
      });

      await t.xpHistory.create({
        data: {
          userId,
          amount: xpAwarded,
          reason: "WATCH_STREAK",
          details: `Watch streak: ${streakValue} streams`,
        },
      });

      await t.coinHistory.create({
        data: {
          userId,
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