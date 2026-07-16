import { prisma } from "../../shared/lib";
import { getXpThresholdForLevel } from "../../shared/utils";
import { XP_CONFIG } from "./stream.constants";

export class StreamService {
  private verifiedUsersCache = new Set<string>();

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

  public async addStreamXp(xpAmount: number): Promise<void> {
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

    if (hasLeveledUp) {
      // TODO: globalEventBus.emit("", {data...})
    }
  }
}
