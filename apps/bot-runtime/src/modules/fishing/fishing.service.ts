import type { FishCatch } from "@fox-sphere/backend-shared";
import {
  JACKPOT_SEED,
  Logger,
  prisma,
  resolveCatch,
  secureRandomInt,
  XP_CONFIG,
} from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../shared/services";
import { requireChannelUser } from "../channel";
import { UserService } from "../user";
import { FISHING_CONFIG } from "./fishing.constants";

interface FishPendingState {
  twitchId: string;
  username: string;
  channel: string;
  timers: NodeJS.Timeout[];
}

export class FishingService {
  // Pending-состояние в памяти: twitchId -> открытый заброс. Рестарт бота теряет незавершённые
  // рыбалки — осознанно (спека: состояние дешёвое, TTL короткий). В БД не выносим.
  private pending = new Map<string, FishPendingState>();

  constructor(private userService: UserService) {}

  public cast(input: {
    twitchId: string;
    username: string;
    channel: string;
  }): "accepted" | "already" {
    const existing = this.pending.get(input.twitchId);
    if (existing) {
      return "already";
    }

    this.clearPending(input.twitchId);

    const state: FishPendingState = {
      twitchId: input.twitchId,
      username: input.username,
      channel: input.channel,
      timers: [],
    };
    this.pending.set(input.twitchId, state);

    // Поклёвка через 10–30с (общий RNG с рулеткой). Таймеры unref — не держат
    // процесс, попытка живёт только пока работает воркер.
    const biteDelayMs =
      FISHING_CONFIG.BITE_DELAY_MIN_MS +
      secureRandomInt(
        FISHING_CONFIG.BITE_DELAY_MAX_MS - FISHING_CONFIG.BITE_DELAY_MIN_MS + 1,
      );

    state.timers.push(
      setTimeout(() => {
        // Никто не ждёт этот промис: поклёвка приходит по таймеру, а не из команды. Ошибку
        // выплаты логируем здесь, иначе она ушла бы в unhandledRejection.
        this.onBite(state).catch((error: unknown) => {
          Logger.error("FishingService", `Catch failed for @${state.username}`, error);
        });
      }, biteDelayMs).unref(),
    );

    Logger.debug(
      "FishingService",
      `${input.username} cast a line — bite in ${biteDelayMs}ms`,
    );

    return "accepted";
  }

  // Поклёвка сама решает исход. Раньше бот ждал `!тянуть` и 60с окна ответа, и рыба срывалась,
  // если зритель отвлёкся: улов терялся вместе с минутным кулдауном, и «ничего не вышло» было
  // двумя разными причинами — пустым уловом и собственным промахом. Теперь промахнуться нельзя,
  // и единственный источник «ничего» — это сам улов, который объявляется как «сорвалась».
  private async onBite(state: FishPendingState): Promise<void> {
    // Гард от устаревшего таймера: cast мог перезаписать запись или clearPending
    // уже снять её — тогда старая попытка не должна ничего эмитить.
    const current = this.pending.get(state.twitchId);
    if (current !== state) return;

    const caught = resolveCatch();
    if (caught.catchType !== "empty") {
      await this.grantCatch(state.twitchId, caught);
    }

    this.clearPending(state.twitchId);

    Logger.info("FishingService", `Bite resolved for @${state.username} — ${caught.catchType}`);
    globalEventBus.emit("fish:bite", {
      channel: state.channel,
      username: state.username,
      catch: caught,
    });
  }

  private async grantCatch(twitchId: string, caught: FishCatch): Promise<void> {
    if (caught.catchType === "coins" || caught.catchType === "xp") {
      // `requireChannelUser`, not a `User` lookup guarded by an early `return`. `User` is
      // frozen from the Release B migration onward and `ensureChannelUser` no longer writes it,
      // so every viewer whose first message landed after that deploy has no `User` row at all -
      // and the old guard dropped the reward silently, for exactly those viewers, with nothing
      // in the log. A thrown `NotFoundError` names the viewer and the channel instead, and
      // `trackActivity` has already ensured the row exists before a `!тянуть` can reach here.
      const channelUser = await requireChannelUser(twitchId);

      if (caught.catchType === "coins") {
        await this.userService.addCoins(twitchId, caught.coinAmount);
        await prisma.coinHistory.create({
          data: {
            // Read off the balance row, never off a second context lookup: the ledger row and
            // the coins it explains have to name the same pair, and taking both from one row is
            // what makes that impossible to get wrong.
            channelId: channelUser.channelId,
            channelUserId: channelUser.id,
            amount: caught.coinAmount,
            reason: "FISH",
            details: `Fishing catch: ${caught.coinAmount} coins`,
          },
        });
      } else {
        await this.userService.addXp(twitchId, caught.xpAmount);
        await prisma.xpHistory.create({
          data: {
            channelId: channelUser.channelId,
            channelUserId: channelUser.id,
            amount: caught.xpAmount,
            reason: "FISH",
            details: `Fishing catch: ${caught.xpAmount} XP`,
          },
        });
      }
      return;
    }

    if (caught.catchType === "bank") {
      // Банк-улов: монеты в SystemState.jackpotTotal, записи юзеру не создаём.
      const state = await prisma.systemState.upsert({
        where: { id: XP_CONFIG.STREAM_STATE_ID },
        update: { jackpotTotal: { increment: caught.bankAmount } },
        create: {
          id: XP_CONFIG.STREAM_STATE_ID,
          streamLevel: 1,
          streamCurrentXp: 0,
          jackpotTotal: JACKPOT_SEED + caught.bankAmount,
        },
      });

      globalEventBus.emit("stream:jackpot-updated", {
        jackpotTotal: state.jackpotTotal,
      });
    }
  }

  private clearPending(twitchId: string): void {
    const state = this.pending.get(twitchId);
    if (!state) return;
    for (const timer of state.timers) clearTimeout(timer);
    this.pending.delete(twitchId);
  }

  public stop(): void {
    for (const state of this.pending.values()) {
      for (const timer of state.timers) clearTimeout(timer);
    }
    this.pending.clear();
  }
}
