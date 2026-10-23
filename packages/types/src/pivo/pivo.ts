/**
 * Пороги ступеней золотого пива: первая ступень — сразу первое выбитое, дальше по счётчику.
 * При p = 5% и кулдауне 60с на пользователя это 20/40/80/140/260 ожидаемых попыток.
 *
 * Лестница живёт здесь, а не в боте и не в оверлее: порог нужен обоим, и две копии
 * разошлись бы молча — оверлей показал бы бейдж ступени, для которой нет картинки.
 */
export const PIVO_TIER_THRESHOLDS = [1, 2, 4, 7, 13] as const;

export const PIVO_TIER_COUNT = PIVO_TIER_THRESHOLDS.length;

/** 0 — ступени ещё нет; 1..5 — последняя достигнутая. */
export const getGoldenBeerTier = (goldenBeers: number): number => {
  if (!Number.isFinite(goldenBeers) || goldenBeers < PIVO_TIER_THRESHOLDS[0]) return 0;

  let tier = 0;

  for (const threshold of PIVO_TIER_THRESHOLDS) {
    if (goldenBeers < threshold) break;
    tier += 1;
  }

  return tier;
};
