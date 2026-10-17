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
      coinAmount: 60,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(369))).toEqual({
      prizeType: "coins",
      coinAmount: 60,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(370))).toEqual({
      prizeType: "coins",
      coinAmount: 75,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(429))).toEqual({
      prizeType: "coins",
      coinAmount: 75,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(430))).toEqual({
      prizeType: "coins",
      coinAmount: 100,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(784))).toEqual({
      prizeType: "coins",
      coinAmount: 100,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(785))).toEqual({
      prizeType: "coins",
      coinAmount: 250,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(864))).toEqual({
      prizeType: "coins",
      coinAmount: 250,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(865))).toEqual({
      prizeType: "coins",
      coinAmount: 500,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(884))).toEqual({
      prizeType: "coins",
      coinAmount: 500,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(885))).toEqual({
      prizeType: "coins",
      coinAmount: 1000,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(889))).toEqual({
      prizeType: "coins",
      coinAmount: 1000,
      xpAmount: 0,
    });
    expect(resolveSpinPrize(rng(890))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 35,
    });
    expect(resolveSpinPrize(rng(964))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 35,
    });
    expect(resolveSpinPrize(rng(965))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 100,
    });
    expect(resolveSpinPrize(rng(998))).toEqual({
      prizeType: "xp",
      coinAmount: 0,
      xpAmount: 100,
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
      coins60: 15,
      coins75: 6,
      coins100: 35.5,
      coins250: 8,
      coins500: 2,
      coins1000: 0.5,
      xp35: 7.5,
      xp100: 3.4,
      jackpot: 0.1,
    };

    for (const [category, chance] of Object.entries(declaredChances)) {
      const rate = ((counts[category] ?? 0) / 100_000) * 100;
      expect(Math.abs(rate - chance)).toBeLessThan(0.5);
    }
  });
});
