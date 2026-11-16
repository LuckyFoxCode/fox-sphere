import type {
  StreamXpBoostPayload,
  TwitchTimerPayload,
  WidgetVariant,
} from "@fox-sphere/types";
import {
  getXpThresholdForLevel,
  prisma,
  resolveActiveXpBoost,
  XP_CONFIG,
} from "@fox-sphere/backend-shared";
import type { ActiveXpBoost } from "@fox-sphere/backend-shared";
import { globalEventBus } from "../../shared/services";
import { BOOST_CONFIG } from "./stream.constants";

export class StreamService {
  private xpBoostCache: {
    boost: ActiveXpBoost | null;
    fetchedAt: number;
  } | null = null;
  private static readonly XP_BOOST_CACHE_TTL = 1000;

  public async getOrCreateState() {
    return await prisma.systemState.upsert({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      update: {},
      create: {
        id: XP_CONFIG.STREAM_STATE_ID,
        streamLevel: 1,
        streamCurrentXp: 0,
      },
    });
  }

  public async getActiveXpBoost(): Promise<ActiveXpBoost | null> {
    const now = Date.now();

    if (
      this.xpBoostCache &&
      now - this.xpBoostCache.fetchedAt < StreamService.XP_BOOST_CACHE_TTL
    ) {
      return this.xpBoostCache.boost;
    }

    const state = await this.getOrCreateState();
    const boost = resolveActiveXpBoost(state);

    this.xpBoostCache = { boost, fetchedAt: now };
    return boost;
  }

  public async activateXpBoost(input: {
    multiplier: number;
    durationMs: number;
    source: StreamXpBoostPayload["source"];
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + input.durationMs);

    await prisma.systemState.upsert({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      update: {
        xpBoostMultiplier: input.multiplier,
        xpBoostExpiresAt: expiresAt,
      },
      create: {
        id: XP_CONFIG.STREAM_STATE_ID,
        streamLevel: 1,
        streamCurrentXp: 0,
        xpBoostMultiplier: input.multiplier,
        xpBoostExpiresAt: expiresAt,
      },
    });

    this.xpBoostCache = {
      boost: { multiplier: input.multiplier, expiresAt: expiresAt.getTime() },
      fetchedAt: Date.now(),
    };

    const payload: StreamXpBoostPayload = {
      multiplier: input.multiplier,
      expiresAt: expiresAt.getTime(),
      source: input.source,
      canceled: false,
    };
    globalEventBus.emit("stream:xp-boost", payload);
  }

  public async deactivateXpBoost(): Promise<void> {
    await prisma.systemState.upsert({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      update: {
        xpBoostMultiplier: 1,
        xpBoostExpiresAt: null,
      },
      create: {
        id: XP_CONFIG.STREAM_STATE_ID,
        streamLevel: 1,
        streamCurrentXp: 0,
        xpBoostMultiplier: 1,
        xpBoostExpiresAt: null,
      },
    });

    this.xpBoostCache = { boost: null, fetchedAt: Date.now() };

    const payload: StreamXpBoostPayload = {
      multiplier: BOOST_CONFIG.MULTIPLIER,
      expiresAt: 0,
      source: "command",
      canceled: true,
    };
    globalEventBus.emit("stream:xp-boost", payload);
  }

  /**
   * Запускает `!timer` и делает это единственным местом, где таймер записан.
   *
   * Хранится абсолютный `endsAt`, а не остаток: перезагруженная сцена OBS
   * догоняет идущий таймер запросом `twitch:get-timer`, и дедлайн — это то, что
   * переживает и перезагрузку, и рестарт бота. Событие эмитится после `upsert`,
   * поэтому оверлей, поднятый посреди стрима, и оверлей, открытый до команды,
   * видят один и тот же момент окончания.
   */
  public async startStreamTimer(input: {
    minutes: number;
    color: WidgetVariant;
    title: string;
  }): Promise<void> {
    const endsAt = new Date(Date.now() + input.minutes * 60_000);

    await prisma.systemState.upsert({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      update: {
        timerTitle: input.title,
        timerColor: input.color,
        timerEndsAt: endsAt,
      },
      create: {
        id: XP_CONFIG.STREAM_STATE_ID,
        streamLevel: 1,
        streamCurrentXp: 0,
        timerTitle: input.title,
        timerColor: input.color,
        timerEndsAt: endsAt,
      },
    });

    const payload: TwitchTimerPayload = {
      title: input.title,
      color: input.color,
      endsAt: endsAt.getTime(),
    };
    globalEventBus.emit("twitch:timer", payload);
  }

  /**
   * Убирает таймер. Команда остаётся единственным способом это сделать —
   * истечение таймера лишь перестаёт его показывать (`resolveActiveTimer`), а
   * строка не чистится, чтобы повторный `!stoptimer` не был пустышкой.
   */
  public async stopStreamTimer(): Promise<void> {
    await prisma.systemState.upsert({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      update: {
        timerTitle: null,
        timerColor: null,
        timerEndsAt: null,
      },
      create: {
        id: XP_CONFIG.STREAM_STATE_ID,
        streamLevel: 1,
        streamCurrentXp: 0,
        timerTitle: null,
        timerColor: null,
        timerEndsAt: null,
      },
    });

    globalEventBus.emit("twitch:timer-stop", {});
  }

  public async updateStreamXp(xpAmount: number): Promise<void> {
    const state = await this.getOrCreateState();

    const newXp = state.streamCurrentXp + xpAmount;

    let currentLvl = state.streamLevel;
    let hasLeveledUp = false;
    let nextLevelThreshold = getXpThresholdForLevel(
      currentLvl,
      XP_CONFIG.BASE_STREAM_STEP,
    );
    while (newXp >= nextLevelThreshold) {
      currentLvl++;
      nextLevelThreshold = getXpThresholdForLevel(
        currentLvl,
        XP_CONFIG.BASE_STREAM_STEP,
      );
      hasLeveledUp = true;
    }

    await prisma.systemState.update({
      where: { id: XP_CONFIG.STREAM_STATE_ID },
      data: {
        streamCurrentXp: newXp,
        streamLevel: currentLvl,
      },
    });
    globalEventBus.emit("stream:xp-updated", {
      newXp,
      lvl: currentLvl,
      maxXp: nextLevelThreshold,
      startXp: getXpThresholdForLevel(
        currentLvl - 1,
        XP_CONFIG.BASE_STREAM_STEP,
      ),
    });

    if (hasLeveledUp) {
      globalEventBus.emit("stream:level-up", { lvl: currentLvl });

      const activeBoost = await this.getActiveXpBoost();
      if (!activeBoost) {
        await this.activateXpBoost({
          multiplier: BOOST_CONFIG.MULTIPLIER,
          durationMs: BOOST_CONFIG.AUTO_DURATION,
          source: "auto",
        });
      }
    }
  }
}
