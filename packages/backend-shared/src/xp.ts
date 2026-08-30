export const getXpThresholdForLevel = (
  lvl: number,
  step: number = 100,
): number => {
  let totalXpNeeded = 0;
  for (let i = 0; i <= lvl; i++) {
    totalXpNeeded += i * step;
  }

  return totalXpNeeded;
};

export interface ActiveXpBoost {
  multiplier: number;
  expiresAt: number;
}

export const resolveActiveXpBoost = (state: {
  xpBoostExpiresAt: Date | null;
  xpBoostMultiplier: number;
}): ActiveXpBoost | null => {
  const now = Date.now();

  if (!state.xpBoostExpiresAt || state.xpBoostExpiresAt.getTime() <= now) {
    return null;
  }

  return {
    multiplier: state.xpBoostMultiplier,
    expiresAt: state.xpBoostExpiresAt.getTime(),
  };
};
