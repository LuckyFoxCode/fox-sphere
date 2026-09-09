import type { RoulettePrizeType } from "@fox-sphere/types";
import { pickWeighted, secureRandomInt } from "./random";

export const JACKPOT_SEED = 1000;

export interface RoulettePrize {
  prizeType: RoulettePrizeType;
  coinAmount: number;
  xpAmount: number;
}

// Веса = заявленные шансы ×10 (5.9% → 59, 0.1% → 1); сумма = 1000.
export const ROULETTE_PRIZE_WEIGHTS = {
  empty: 220,
  coins30: 300,
  coins60: 200,
  coins100: 130,
  coins250: 90,
  xp35: 59,
  jackpot: 1,
} as const;

const ROULETTE_PRIZE_MAP = {
  empty: { prizeType: "empty", coinAmount: 0, xpAmount: 0 },
  coins30: { prizeType: "coins", coinAmount: 30, xpAmount: 0 },
  coins60: { prizeType: "coins", coinAmount: 60, xpAmount: 0 },
  coins100: { prizeType: "coins", coinAmount: 100, xpAmount: 0 },
  coins250: { prizeType: "coins", coinAmount: 250, xpAmount: 0 },
  xp35: { prizeType: "xp", coinAmount: 0, xpAmount: 35 },
  jackpot: { prizeType: "jackpot", coinAmount: 0, xpAmount: 0 },
} as const satisfies Record<keyof typeof ROULETTE_PRIZE_WEIGHTS, RoulettePrize>;

export const resolveSpinPrize = (
  rng: (maxExclusive: number) => number = secureRandomInt,
): RoulettePrize => {
  const category = pickWeighted(ROULETTE_PRIZE_WEIGHTS, rng);
  return { ...ROULETTE_PRIZE_MAP[category] };
};