import { pickWeighted, secureRandomInt } from "./random";

export type FishCatchType = "empty" | "coins" | "xp" | "bank";

export interface FishCatch {
  catchType: FishCatchType;
  coinAmount: number;
  xpAmount: number;
  bankAmount: number;
}

// Веса = заявленные шансы ×10 (45% → 450, 2% → 20); сумма = 1000.
export const FISH_CATCH_WEIGHTS = {
  empty: 450,
  coins8: 300,
  coins20: 120,
  xp10: 60,
  coins100: 30,
  xp35: 20,
  bank200: 20,
} as const;

const FISH_CATCH_MAP = {
  empty: { catchType: "empty", coinAmount: 0, xpAmount: 0, bankAmount: 0 },
  coins8: { catchType: "coins", coinAmount: 8, xpAmount: 0, bankAmount: 0 },
  coins20: { catchType: "coins", coinAmount: 20, xpAmount: 0, bankAmount: 0 },
  xp10: { catchType: "xp", coinAmount: 0, xpAmount: 10, bankAmount: 0 },
  coins100: { catchType: "coins", coinAmount: 100, xpAmount: 0, bankAmount: 0 },
  xp35: { catchType: "xp", coinAmount: 0, xpAmount: 35, bankAmount: 0 },
  bank200: { catchType: "bank", coinAmount: 0, xpAmount: 0, bankAmount: 200 },
} as const satisfies Record<keyof typeof FISH_CATCH_WEIGHTS, FishCatch>;

export const resolveCatch = (
  rng: (maxExclusive: number) => number = secureRandomInt,
): FishCatch => {
  const category = pickWeighted(FISH_CATCH_WEIGHTS, rng);
  return { ...FISH_CATCH_MAP[category] };
};