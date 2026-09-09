import {
  JACKPOT_SEED,
  prisma,
  resolveSpinPrize,
  secureRandomInt,
  XP_CONFIG,
} from "@fox-sphere/backend-shared";
import type { RouletteSpinResultPayload } from "@fox-sphere/types";
import { globalEventBus } from "../../shared/services";
import { UserService } from "../user";
import { ROULETTE_CONFIG } from "./roulette.constants";

export class RouletteService {
  // Сериализация спинов: один spinUser выполняется в момент времени (очередь-цепочка).
  // Защита от гонки сброса джекпота при одновременных спинах разных юзеров.
  private spinQueue: Promise<void> = Promise.resolve();

  constructor(private userService: UserService) {}

  public async spinUser(input: {
    twitchId: string;
    username: string;
  }): Promise<RouletteSpinResultPayload> {
    const run = this.spinQueue.then(() => this.runSpin(input));
    this.spinQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async runSpin(input: {
    twitchId: string;
    username: string;
  }): Promise<RouletteSpinResultPayload> {
    const prize = resolveSpinPrize(secureRandomInt);

    const { jackpotWon, jackpotTotalAfter, coinAmount } =
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { twitchId: input.twitchId },
        });

        // Атомарное списание с условием достаточности — страховка от гонки
        // между проверкой getUserCoins (кэш TTL 10с) и транзакцией. При count === 0
        // транзакция откатывается, ничего не меняя; сообщение юзеру шлёт команда до сервиса,
        // сюда это попадает только при реальной гонке и логируется реестром как ошибка.
        const debited = await tx.user.updateMany({
          where: { id: user.id, coins: { gte: ROULETTE_CONFIG.PRICE } },
          data: {
            coins: { decrement: ROULETTE_CONFIG.PRICE },
            spinsCount: { increment: 1 },
            totalLoss: { increment: ROULETTE_CONFIG.PRICE },
          },
        });

        if (debited.count === 0) {
          throw new Error(
            "Insufficient coins at transaction time (race between balance check and debit)",
          );
        }

        await tx.coinHistory.create({
          data: {
            userId: user.id,
            amount: -ROULETTE_CONFIG.PRICE,
            reason: "SPIN",
          },
        });

        await tx.systemState.upsert({
          where: { id: XP_CONFIG.STREAM_STATE_ID },
          update: { jackpotTotal: { increment: ROULETTE_CONFIG.JACKPOT_SHARE } },
          create: {
            id: XP_CONFIG.STREAM_STATE_ID,
            streamLevel: 1,
            streamCurrentXp: 0,
            jackpotTotal:
              ROULETTE_CONFIG.JACKPOT_SEED + ROULETTE_CONFIG.JACKPOT_SHARE,
          },
        });

        // Перечитываем банк после взноса — выплата/остаток идут по фактическому банку.
        const bankAfterShare =
          (await tx.systemState.findFirst())?.jackpotTotal ??
          ROULETTE_CONFIG.JACKPOT_SEED;

        let jackpotWon = false;
        let jackpotTotalAfter = bankAfterShare;
        let coinAmount = 0;

        if (prize.prizeType === "coins") {
          coinAmount = prize.coinAmount;
          await tx.user.update({
            where: { id: user.id },
            data: {
              coins: { increment: coinAmount },
              totalWin: { increment: coinAmount },
            },
          });
          await tx.coinHistory.create({
            data: {
              userId: user.id,
              amount: coinAmount,
              reason: "SPIN_PRIZE",
              details: `Roulette prize: ${coinAmount} coins`,
            },
          });
        } else if (prize.prizeType === "jackpot") {
          jackpotWon = true;
          coinAmount = bankAfterShare;
          await tx.user.update({
            where: { id: user.id },
            data: {
              coins: { increment: coinAmount },
              totalWin: { increment: coinAmount },
            },
          });
          await tx.coinHistory.create({
            data: {
              userId: user.id,
              amount: coinAmount,
              reason: "JACKPOT",
              details: `Jackpot: ${coinAmount} coins`,
            },
          });
          await tx.systemState.update({
            where: { id: XP_CONFIG.STREAM_STATE_ID },
            data: { jackpotTotal: JACKPOT_SEED },
          });
          jackpotTotalAfter = JACKPOT_SEED;
        }

        return { jackpotWon, jackpotTotalAfter, coinAmount };
      });

    this.userService.invalidateCoins(input.twitchId);

    let xpAmount = 0;
    if (prize.prizeType === "xp") {
      xpAmount = prize.xpAmount;
      await this.userService.addXp(input.twitchId, xpAmount);
    }

    const payload: RouletteSpinResultPayload = {
      userId: input.twitchId,
      username: input.username,
      prizeType: prize.prizeType,
      coinAmount,
      xpAmount,
      jackpotWon,
      jackpotTotalAfter,
    };

    globalEventBus.emit("roulette:spun", payload);

    return payload;
  }
}
