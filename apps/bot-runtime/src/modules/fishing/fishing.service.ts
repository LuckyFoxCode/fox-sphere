import {
  JACKPOT_SEED,
  Logger,
  prisma,
  resolveCatch,
  secureRandomInt,
  XP_CONFIG,
} from "@fox-sphere/backend-shared";
import type { FishCatch } from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../shared/services";
import { UserService } from "../user";
import { FISHING_CONFIG } from "./fishing.constants";

interface FishPendingState {
  twitchId: string;
  username: string;
  channel: string;
  bitten: boolean;
  expired: boolean;
  timers: NodeJS.Timeout[];
}

export type FishingPullResult =
  | { type: "caught"; catch: FishCatch }
  | { type: "waiting" }
  | { type: "expired" }
  | { type: "no-cast" };

export class FishingService {
  // Pending-состояние в памяти: twitchId -> активная/истёкшая попытка. Рестарт
  // бота теряет незавершённые рыбалки — осознанно (спека: состояние дешёвое, TTL
  // короткий, срыв после рестарта безвреден). В БД не выносим.
  private pending = new Map<string, FishPendingState>();

  constructor(private userService: UserService) {}

  public cast(input: {
    twitchId: string;
    username: string;
    channel: string;
  }): "accepted" | "already" {
    const existing = this.pending.get(input.twitchId);
    if (existing && !existing.expired) {
      return "already";
    }

    this.clearPending(input.twitchId);

    const state: FishPendingState = {
      twitchId: input.twitchId,
      username: input.username,
      channel: input.channel,
      bitten: false,
      expired: false,
      timers: [],
    };
    this.pending.set(input.twitchId, state);

    // Поклёвка через 10–30с (общий RNG с рулеткой). Таймеры unref — не держат
    // процесс, попытка живёт только пока работает воркер.
    const biteDelayMs =
      FISHING_CONFIG.BITE_DELAY_MIN_MS +
      secureRandomInt(
        FISHING_CONFIG.BITE_DELAY_MAX_MS -
          FISHING_CONFIG.BITE_DELAY_MIN_MS +
          1,
      );

    state.timers.push(
      setTimeout(() => {
        this.onBite(state);
      }, biteDelayMs).unref(),
    );

    Logger.debug(
      "FishingService",
      `${input.username} cast a line — bite in ${biteDelayMs}ms`,
    );

    return "accepted";
  }

  public async pull(twitchId: string): Promise<FishingPullResult> {
    const state = this.pending.get(twitchId);
    if (!state) return { type: "no-cast" };
    if (state.expired) return { type: "expired" };
    if (!state.bitten) return { type: "waiting" };

    this.clearPending(twitchId);

    const caught = resolveCatch();
    if (caught.catchType !== "empty") {
      await this.grantCatch(twitchId, caught);
    }

    return { type: "caught", catch: caught };
  }

  private onBite(state: FishPendingState): void {
    // Гард от устаревшего таймера: cast мог перезаписать запись или clearPending
    // уже снять её — тогда старая попытка не должна эмитить поклёвку.
    const current = this.pending.get(state.twitchId);
    if (current !== state || state.bitten) return;

    state.bitten = true;
    state.timers.push(
      setTimeout(() => {
        this.onExpiry(state);
      }, FISHING_CONFIG.RESPONSE_WINDOW_MS).unref(),
    );

    Logger.info("FishingService", `Bite for @${state.username} — waiting for pull`);
    globalEventBus.emit("fish:bite", {
      channel: state.channel,
      username: state.username,
    });
  }

  private onExpiry(state: FishPendingState): void {
    const current = this.pending.get(state.twitchId);
    if (current !== state || state.expired) return;

    state.expired = true;
    state.timers.push(
      setTimeout(() => {
        this.clearPending(state.twitchId);
      }, FISHING_CONFIG.EXPIRED_RECALL_MS).unref(),
    );

    Logger.info("FishingService", `Catch expired for @${state.username}`);
    globalEventBus.emit("fish:expired", {
      channel: state.channel,
      username: state.username,
    });
  }

  private async grantCatch(twitchId: string, caught: FishCatch): Promise<void> {
    if (caught.catchType === "coins" || caught.catchType === "xp") {
      const user = await prisma.user.findUnique({
        where: { twitchId },
        select: { id: true },
      });
      if (!user) return;

      if (caught.catchType === "coins") {
        await this.userService.addCoins(twitchId, caught.coinAmount);
        await prisma.coinHistory.create({
          data: {
            userId: user.id,
            amount: caught.coinAmount,
            reason: "FISH",
            details: `Fishing catch: ${caught.coinAmount} coins`,
          },
        });
      } else {
        await this.userService.addXp(twitchId, caught.xpAmount);
        await prisma.xpHistory.create({
          data: {
            userId: user.id,
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
      await prisma.systemState.upsert({
        where: { id: XP_CONFIG.STREAM_STATE_ID },
        update: { jackpotTotal: { increment: caught.bankAmount } },
        create: {
          id: XP_CONFIG.STREAM_STATE_ID,
          streamLevel: 1,
          streamCurrentXp: 0,
          jackpotTotal: JACKPOT_SEED + caught.bankAmount,
        },
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
    for (const twitchId of [...this.pending.keys()]) {
      this.clearPending(twitchId);
    }
  }
}
