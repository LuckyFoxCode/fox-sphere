import { prisma } from "../../shared/lib";
import { globalEventBus } from "../../shared/services";
import { getXpThresholdForLevel } from "../../shared/utils";
import { XP_CONFIG } from "./stream.constants";

export class StreamService {
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

  public async updateStreamXp(xpAmount: number): Promise<void> {
    const state = await this.getOrCreateState();

    const newXp = state.streamCurrentXp + xpAmount;

    let currentLvl = state.streamLevel;
    let hasLeveledUp = false;
    let nextLevelThreshold = getXpThresholdForLevel(
      currentLvl,
      XP_CONFIG.BASE_STREAM_STEP,
    );
    //					5							1000
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
    });

    if (hasLeveledUp) {
      globalEventBus.emit("stream:level-up", { lvl: currentLvl });
    }
  }
}
