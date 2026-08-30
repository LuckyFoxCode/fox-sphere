import { XP_CONFIG } from "./stream-constants";
import { prisma } from "./prisma";
import { getXpThresholdForLevel, resolveActiveXpBoost } from "./xp";
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
    };
  }
}
