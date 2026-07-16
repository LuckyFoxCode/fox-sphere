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
