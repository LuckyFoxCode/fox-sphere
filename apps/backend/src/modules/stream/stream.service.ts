import type { StreamXpBoostPayload } from "@fox-sphere/types";
import { prisma } from "../../shared/lib";
import { globalEventBus } from "../../shared/services";
import {
  ActiveXpBoost,
  getXpThresholdForLevel,
  resolveActiveXpBoost,
} from "../../shared/utils";
import { BOOST_CONFIG, XP_CONFIG } from "./stream.constants";

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
