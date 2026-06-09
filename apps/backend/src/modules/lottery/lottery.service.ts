import { prisma } from "../../shared/lib";
import { globalEventBus, Logger } from "../../shared/services";

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

    if (lotteryContext.xpThisWeek >= 5 && !lotteryContext.hasTicket) {
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

  async runWeeklyLottery(): Promise<void> {
    try {
      const participants = await prisma.userLottery.findMany({
        where: { hasTicket: true },
        include: { user: true },
      });

      if (participants.length === 0) {
        Logger.info(
          "LotteryService",
          "Розыгрыш запущен, но участников с билетами нет.",
        );
        return;
      }

      const shuffled = [...participants].sort(() => 0.5 - Math.random());

      const winners = shuffled.slice(0, 5);
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
      const winnersNames = winners.map((w) => w.user.username);

      globalEventBus.emit("lottery:finished", {
        winners: winnersNames,
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
