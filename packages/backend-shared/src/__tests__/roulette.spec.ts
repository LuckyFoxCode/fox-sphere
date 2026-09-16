import { describe, expect, it } from "vitest";
import { pickWeighted } from "../random";
import { resolveSpinPrize, ROULETTE_PRIZE_WEIGHTS } from "../roulette";

describe("resolveSpinPrize", () => {
  it("maps exact boundaries of each weight", () => {
    const rng = (value: number) => () => value;

    expect(resolveSpinPrize(rng(219))).toEqual({
      prizeType: "empty",
      coinAmount: 0,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(220))).toEqual({
      prizeType: "coins",
      coinAmount: 30,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(519))).toEqual({
      prizeType: "coins",
      coinAmount: 30,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(520))).toEqual({
      prizeType: "coins",
      coinAmount: 60,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(719))).toEqual({
      prizeType: "coins",
      coinAmount: 60,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(720))).toEqual({
      prizeType: "coins",
      coinAmount: 100,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(849))).toEqual({
      prizeType: "coins",
      coinAmount: 100,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(850))).toEqual({
      prizeType: "coins",
      coinAmount: 250,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(939))).toEqual({
      prizeType: "coins",
      coinAmount: 250,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(940))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 35,
    });
    expect(resolveSpinPrize(rng(998))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 35,
    });
    expect(resolveSpinPrize(rng(999))).toEqual({
      prizeType: "jackpot",
      coinAmount: 0,
      xpAmount: 0,
    });
  });
});

describe("resolveSpinPrize distribution", () => {
  it("hits declared chances within ±0.5pp over 100k spins", () => {
    // Детерминированный LCG — повторяемость без внешнего рандома.
    const lcg = (seed: number) => {
      let state = seed >>> 0;
      return (maxExclusive: number): number => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state % maxExclusive;
      };
    };

    const rng = lcg(0x5eedf00d);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100_000; i++) {
      const category = pickWeighted(ROULETTE_PRIZE_WEIGHTS, rng);
      counts[category] = (counts[category] ?? 0) + 1;
    }

    const declaredChances = {
      empty: 22,
      coins30: 30,
      coins60: 20,
      coins100: 13,
      coins250: 9,
      xp35: 5.9,
      jackpot: 0.1,
    };

    for (const [category, chance] of Object.entries(declaredChances)) {
      const rate = ((counts[category] ?? 0) / 100_000) * 100;
      expect(Math.abs(rate - chance)).toBeLessThan(0.5);
    }
  });
});
