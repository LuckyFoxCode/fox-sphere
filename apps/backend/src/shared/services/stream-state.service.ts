import { XP_CONFIG } from "../../modules/stream";
import { prisma } from "../lib";
import { getXpThresholdForLevel } from "../utils";
import { Logger } from "./logger.service";

export async function getStreamStatePrepared() {
  try {
    const state = await prisma.systemState.findFirst();
    const currentLvl = state?.streamLevel || 1;
    const nextLevelThreshold = getXpThresholdForLevel(
      currentLvl,
      XP_CONFIG.BASE_STREAM_STEP,
    );

    return {
      lvl: currentLvl,
      newXp: state?.streamCurrentXp || 0,
      maxXp: nextLevelThreshold,
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
    };
  }
}
