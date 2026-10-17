import type { RoulettePrizeType } from "@fox-sphere/types";
import { pickWeighted, secureRandomInt } from "./random";

export const JACKPOT_SEED = 1000;

export interface RoulettePrize {
  prizeType: RoulettePrizeType;
  coinAmount: number;
  xpAmount: number;
}

// Веса = заявленные шансы ×10 (22.0% → 220, 0.1% → 1); сумма = 1000.
// Порядок ключей значим: pickWeighted итерирует Object.entries по порядку объявления.
export const ROULETTE_PRIZE_WEIGHTS = {
  empty: 220,
  coins60: 150,
  coins75: 60,
  coins100: 355,
  coins250: 80,
  coins500: 20,
  coins1000: 5,
  xp35: 75,
  xp100: 34,
  jackpot: 1,
} as const;

const ROULETTE_PRIZE_MAP = {
  empty: { prizeType: "empty", coinAmount: 0, xpAmount: 0 },
  coins60: { prizeType: "coins", coinAmount: 60, xpAmount: 0 },
  coins75: { prizeType: "coins", coinAmount: 75, xpAmount: 0 },
  coins100: { prizeType: "coins", coinAmount: 100, xpAmount: 0 },
  coins250: { prizeType: "coins", coinAmount: 250, xpAmount: 0 },
  coins500: { prizeType: "coins", coinAmount: 500, xpAmount: 0 },
  coins1000: { prizeType: "coins", coinAmount: 1000, xpAmount: 0 },
  xp35: { prizeType: "xp", coinAmount: 0, xpAmount: 35 },
  xp100: { prizeType: "xp", coinAmount: 0, xpAmount: 100 },
  jackpot: { prizeType: "jackpot", coinAmount: 0, xpAmount: 0 },
} as const satisfies Record<keyof typeof ROULETTE_PRIZE_WEIGHTS, RoulettePrize>;

export const resolveSpinPrize = (
  rng: (maxExclusive: number) => number = secureRandomInt,
): RoulettePrize => {
  const category = pickWeighted(ROULETTE_PRIZE_WEIGHTS, rng);
  return { ...ROULETTE_PRIZE_MAP[category] };
};
