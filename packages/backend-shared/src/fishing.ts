import { pickWeighted, secureRandomInt } from "./random";

export type FishCatchType = "empty" | "coins" | "xp" | "bank";

export interface FishCatch {
  catchType: FishCatchType;
  coinAmount: number;
  xpAmount: number;
  bankAmount: number;
}

// Веса = заявленные шансы ×10 (22% → 220, 0.8% → 8); сумма = 1000.
// Порядок ключей значим: pickWeighted итерирует Object.entries по порядку объявления.
export const FISH_CATCH_WEIGHTS = {
  empty: 220,
  coins25: 300,
  coins70: 100,
  coins100: 8,
  xp20: 250,
  xp60: 97,
  bank200: 25,
} as const;

const FISH_CATCH_MAP = {
  empty: { catchType: "empty", coinAmount: 0, xpAmount: 0, bankAmount: 0 },
  coins25: { catchType: "coins", coinAmount: 25, xpAmount: 0, bankAmount: 0 },
  coins70: { catchType: "coins", coinAmount: 70, xpAmount: 0, bankAmount: 0 },
  coins100: { catchType: "coins", coinAmount: 100, xpAmount: 0, bankAmount: 0 },
  xp20: { catchType: "xp", coinAmount: 0, xpAmount: 20, bankAmount: 0 },
  xp60: { catchType: "xp", coinAmount: 0, xpAmount: 60, bankAmount: 0 },
  bank200: { catchType: "bank", coinAmount: 0, xpAmount: 0, bankAmount: 200 },
} as const satisfies Record<keyof typeof FISH_CATCH_WEIGHTS, FishCatch>;

export const resolveCatch = (
  rng: (maxExclusive: number) => number = secureRandomInt,
): FishCatch => {
  const category = pickWeighted(FISH_CATCH_WEIGHTS, rng);
  return { ...FISH_CATCH_MAP[category] };
};
