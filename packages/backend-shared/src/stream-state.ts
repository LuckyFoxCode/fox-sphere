import { JACKPOT_SEED } from "./roulette";
import { XP_CONFIG } from "./stream-constants";
import { prisma } from "./prisma";
import { getXpThresholdForLevel, resolveActiveXpBoost } from "./xp";
import { resolveActiveTimer } from "./stream-timer";
import type { ActiveStreamTimer } from "@fox-sphere/types";
import { Logger } from "./logger";

export async function getStreamStatePrepared() {
  try {
    const state = await prisma.systemState.findFirst();
    const currentLvl = state?.streamLevel || 1;
    const nextLevelThreshold = getXpThresholdForLevel(
      currentLvl,
      XP_CONFIG.BASE_STREAM_STEP,
    );

    const xpBoost = state ? resolveActiveXpBoost(state) : null;

    return {
      lvl: currentLvl,
      newXp: state?.streamCurrentXp || 0,
      maxXp: nextLevelThreshold,
      startXp: getXpThresholdForLevel(
        currentLvl - 1,
        XP_CONFIG.BASE_STREAM_STEP,
      ),
      xpBoost,
      jackpotTotal: state?.jackpotTotal ?? JACKPOT_SEED,
    };
  } catch (error) {
    Logger.error(
      "StreamStateService",
      "getSystemStatePrepared: Database processing failed",
      error,
    );
    return {
      lvl: 1,
      newXp: 0,
      maxXp: XP_CONFIG.BASE_STREAM_STEP,
      startXp: 0,
      xpBoost: null,
      jackpotTotal: JACKPOT_SEED,
    };
  }
}

/**
 * Таймер, который идёт прямо сейчас, — то, что спрашивает перезагруженная
 * сцена OBS через ack `twitch:get-timer`.
 *
 * Живёт здесь, рядом с `getStreamStatePrepared`, а не в `StreamService`: это
 * чтение той же строки `SystemState`, и оно нужно серверу сокетов, который
 * сервис не создаёт. Ошибка БД отдаёт `null`, а не бросает — как и остальной
 * путь восстановления состояния: сломанная база не должна ронять оверлей,
 * который умеет работать без таймера.
 */
export async function getActiveStreamTimer(): Promise<ActiveStreamTimer | null> {
  try {
    const state = await prisma.systemState.findFirst();
    return state ? resolveActiveTimer(state) : null;
  } catch (error) {
    Logger.error(
      "StreamStateService",
      "getActiveStreamTimer: Database processing failed",
      error,
    );
    return null;
  }
}
