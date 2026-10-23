import { pickWeighted, secureRandomInt } from "./random";

// Веса = заявленные шансы ×10 (5% → 50); сумма = 1000. Порядок ключей значим:
// pickWeighted итерирует Object.entries по порядку объявления.
//
// Это не «более честный» рандом, чем `Math.random() < 0.05` — обе формы дают ровно 5%.
// Таблица нужна, чтобы шанс был записан целыми числами (его видно) и чтобы его можно было
// проверить точной границей через инъекцию rng, как это делают fishing.ts и roulette.ts.
export const PIVO_OUTCOME_WEIGHTS = {
  regular: 950,
  golden: 50,
} as const;

export type PivoOutcome = keyof typeof PIVO_OUTCOME_WEIGHTS;

export const resolvePivoOutcome = (
  rng: (maxExclusive: number) => number = secureRandomInt,
): PivoOutcome => pickWeighted(PIVO_OUTCOME_WEIGHTS, rng);
