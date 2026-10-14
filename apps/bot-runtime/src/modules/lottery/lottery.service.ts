import { Logger, prisma } from "@fox-sphere/backend-shared";
import { LotteryUserDto } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import { resolveChannelContext } from "../channel";
import type { ChannelUserWithViewer } from "../channel";
import { TwitchConfig } from "../twitch/twitch.types";
import { LOTTERY_CONFIG } from "./lottery.constants";
import { shuffleArray } from "./lottery.utils";

// A `ChannelUser` row reduced to what every lottery event needs: the row itself, for the
// writes, and the viewer's identity, for the payloads. Read through `viewer` because
// `twitchId` and `username` are `Viewer` columns - a `ChannelUser` names nobody on its own.
type LotteryRow = Pick<ChannelUserWithViewer, "id"> & {
  viewer: Pick<ChannelUserWithViewer["viewer"], "twitchId" | "username">;
};

const LOTTERY_ROW_SELECT = {
  id: true,
  viewer: { select: { twitchId: true, username: true } },
} as const;

const toLotteryUser = (row: LotteryRow): LotteryUserDto => ({
  twitchId: row.viewer.twitchId,
  username: row.viewer.username,
});

export class LotteryService {
  constructor(private twitchConfig: TwitchConfig) {}

  /**
   * Adds one chat message's worth of weekly XP, and hands out the ticket once the threshold is
   * passed.
   *
   * Takes the balance row rather than a bare id. The three lottery columns used to live in a
   * `UserLottery` row joined to `User`, and the caller resolved the id this received against
   * that table — so once `UserService` switched to handing over a `ChannelUser.id`, weekly XP
   * became a no-op for anyone without a `User` row and was silently credited to whoever
   * happened to hold that number in the legacy table. Passing the row removes the number from
   * the signature entirely: there is no identifier left to mean the wrong thing.
   */
  public async processMessageXp(
    channelUser: ChannelUserWithViewer,
    baseXp: number = 1,
  ): Promise<void> {
    const { twitchId, username } = channelUser.viewer;

    if (
      twitchId === this.twitchConfig.userId ||
      twitchId === this.twitchConfig.botId ||
      channelUser.isPermanentVip
    ) {
      return;
    }

    // An update rather than the upsert this used to need: `UserLottery` had to be created on
    // first sight, while `ChannelUser` is the row the caller has already resolved and is
    // guaranteed to exist. The returned row carries the post-increment total, which is what the
    // threshold check needs - the old code read it back off the upsert's result.
    const updated = await prisma.channelUser.update({
      where: { id: channelUser.id },
      data: { xpThisWeek: { increment: baseXp } },
    });

    if (
      updated.xpThisWeek >= LOTTERY_CONFIG.TICKET_XP_THRESHOLD &&
      !updated.hasTicket
    ) {
      await prisma.channelUser.update({
        where: { id: channelUser.id },
        data: {
          hasTicket: true,
        },
      });

      Logger.debug(
        "LotteryService",
        `Пользователь ${username} набрал ${updated.xpThisWeek} XP и получил лотерейный билет!🎫`,
      );

      globalEventBus.emit("lottery:ticket-earned", {
        twitchId,
        username,
      });
    }
  }

  public async runWeeklyLottery(): Promise<boolean> {
    try {
      // Scoped to the resolved channel, which the whole of this method was not before: the
      // reset statements below had no `where` at all, so one channel's draw cleared every
      // channel's tickets. With one channel that was invisible, which is exactly why it is
      // worth writing down rather than inheriting.
      const { channelId } = await resolveChannelContext();

      const oldWinners = await prisma.channelUser.findMany({
        where: { channelId, isLuckyVip: true },
        select: LOTTERY_ROW_SELECT,
      });

      const participants = await prisma.channelUser.findMany({
        where: {
          channelId,
          hasTicket: true,
          isPermanentVip: false,
        },
        select: LOTTERY_ROW_SELECT,
      });

      if (participants.length === 0) {
        Logger.info("LotteryService", "Розыгрыш запущен, но участников нет.");

        await prisma.$transaction([
          prisma.channelUser.updateMany({
            where: { channelId, isLuckyVip: true },
            data: { isLuckyVip: false },
          }),
          prisma.channelUser.updateMany({
            where: { channelId },
            data: {
              xpThisWeek: 0,
              hasTicket: false,
            },
          }),
        ]);

        globalEventBus.emit("lottery:no-participants", {
          oldWinners: oldWinners.map(toLotteryUser),
        });

        return false;
      }

      const shuffled = shuffleArray(participants);
      const winners = shuffled.slice(0, LOTTERY_CONFIG.WINNERS_COUNT);
      const winnerIds = winners.map((w) => w.id);

      await prisma.$transaction([
        prisma.channelUser.updateMany({
          where: { channelId, isLuckyVip: true },
          data: { isLuckyVip: false },
        }),

        prisma.channelUser.updateMany({
          where: { id: { in: winnerIds } },
          data: { isLuckyVip: true },
        }),

        prisma.channelUser.updateMany({
          where: { channelId },
          data: {
            xpThisWeek: 0,
            hasTicket: false,
          },
        }),
      ]);

      Logger.info(
        "LotteryService",
        `Лотерея успешно проведена! Выбрано победителей: ${winners.length}`,
      );

      globalEventBus.emit("lottery:winners", {
        oldWinners: oldWinners.map(toLotteryUser),
        newWinners: winners.map(toLotteryUser),
        participants: participants.map(toLotteryUser),
      });

      return true;
    } catch (error) {
      Logger.error(
        "LotteryService",
        "Ошибка при выполнении рандомайзера лотереи",
        error,
      );

      return false;
    }
  }
}
