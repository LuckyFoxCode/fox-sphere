import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";
import { LOTTERY_CONFIG } from "./lottery.constants";

export class LotteryService {
  async processMessageXp(userId: number, baseXp: number = 1): Promise<void> {
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

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        globalEventBus.emit("lottery:ticket-earned", {
          twitchId: user.twitchId,
          username: user.username,
        });
      }
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async runWeeklyLottery(): Promise<void> {
    try {
      const oldWinners = await prisma.userLottery.findMany({
        where: { isLuckyVip: true },
        include: { user: true },
      });

      const participants = await prisma.userLottery.findMany({
        where: { hasTicket: true },
        include: { user: true },
      });

      if (participants.length === 0) {
        Logger.info("LotteryService", "Розыгрыш запущен, но участников нет.");
        return;
      }

      const shuffled = this.shuffle(participants);

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

      const oldWinnersMapped = oldWinners.map((w) => ({
        twitchId: w.user.twitchId,
        username: w.user.username,
      }));

      const newWinnersMapped = winners.map((w) => ({
        twitchId: w.user.twitchId,
        username: w.user.username,
      }));

      globalEventBus.emit("lottery:finished", {
        oldWinners: oldWinnersMapped,
        newWinners: newWinnersMapped,
      });
    } catch (error) {
      Logger.error(
        "LotteryService",
        "Ошибка при выполнении рандомайзера лотереи",
        error,
      );
    }
  }
}
