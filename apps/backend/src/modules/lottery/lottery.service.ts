import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";
import { TwitchConfig } from "../twitch/twitch.types";
import { LOTTERY_CONFIG } from "./lottery.constants";
import { shuffleArray } from "./lottery.utils";

export class LotteryService {
  constructor(private twitchConfig: TwitchConfig) {}

  async processMessageXp(userId: number, baseXp: number = 1): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    if (
      user.twitchId === this.twitchConfig.userId ||
      user.twitchId === this.twitchConfig.botId ||
      user.isPermanentVip
    ) {
      return;
    }

    const lotteryContext = await prisma.userLottery.upsert({
      where: { userId },
      update: {
        xpThisWeek: { increment: baseXp },
      },
      create: {
        userId,
        hasTicket: false,
        isLuckyVip: false,
        xpThisWeek: baseXp,
      },
    });

    if (
      lotteryContext.xpThisWeek >= LOTTERY_CONFIG.TICKET_XP_THRESHOLD &&
      !lotteryContext.hasTicket
    ) {
      await prisma.userLottery.update({
        where: { userId },
        data: {
          hasTicket: true,
        },
      });

      Logger.debug(
        "LotteryService",
        `Пользователь с ID ${userId} набрал ${lotteryContext.xpThisWeek} XP и получил лотерейный билет!🎫`,
      );

      globalEventBus.emit("lottery:ticket-earned", {
        twitchId: user.twitchId,
        username: user.username,
      });
    }
  }

  async runWeeklyLottery(): Promise<boolean> {
    try {
      const oldWinners = await prisma.userLottery.findMany({
        where: { isLuckyVip: true },
        include: { user: true },
      });

      const participants = await prisma.userLottery.findMany({
        where: {
          hasTicket: true,
          user: {
            isPermanentVip: false,
          },
        },
        include: { user: true },
      });

      if (participants.length === 0) {
        Logger.info("LotteryService", "Розыгрыш запущен, но участников нет.");

        await prisma.$transaction([
          prisma.userLottery.updateMany({
            where: { isLuckyVip: true },
            data: { isLuckyVip: false },
          }),
          prisma.userLottery.updateMany({
            data: {
              xpThisWeek: 0,
              hasTicket: false,
            },
          }),
        ]);

        globalEventBus.emit("lottery:no-participants", {
          oldWinners: oldWinners.map((w) => ({
            twitchId: w.user.twitchId,
            username: w.user.username,
          })),
        });

        return false;
      }

      const shuffled = shuffleArray(participants);
      const winners = shuffled.slice(0, LOTTERY_CONFIG.WINNERS_COUNT);
      const winnersUserIds = winners.map((w) => w.userId);

      await prisma.$transaction([
        prisma.userLottery.updateMany({
          where: { isLuckyVip: true },
          data: { isLuckyVip: false },
        }),

        prisma.userLottery.updateMany({
          where: { userId: { in: winnersUserIds } },
          data: { isLuckyVip: true },
        }),

        prisma.userLottery.updateMany({
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
        oldWinners: oldWinners.map((w) => ({
          twitchId: w.user.twitchId,
          username: w.user.username,
        })),
        newWinners: winners.map((w) => ({
          twitchId: w.user.twitchId,
          username: w.user.username,
        })),
        participants: participants.map((w) => ({
          twitchId: w.user.twitchId,
          username: w.user.username,
        })),
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
