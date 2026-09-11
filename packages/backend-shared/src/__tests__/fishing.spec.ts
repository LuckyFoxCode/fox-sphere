import { describe, expect, it } from "vitest";
import { pickWeighted } from "../random";
import { FISH_CATCH_WEIGHTS, resolveCatch } from "../fishing";

describe("resolveCatch", () => {
  it("maps exact boundaries of each weight", () => {
    const rng = (value: number) => () => value;

    expect(resolveCatch(rng(0))).toEqual({
      catchType: "empty",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(449))).toEqual({
      catchType: "empty",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(450))).toEqual({
      catchType: "coins",
      coinAmount: 8,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(749))).toEqual({
      catchType: "coins",
      coinAmount: 8,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(750))).toEqual({
      catchType: "coins",
      coinAmount: 20,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(869))).toEqual({
      catchType: "coins",
      coinAmount: 20,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(870))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 10,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(929))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 10,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(930))).toEqual({
      catchType: "coins",
      coinAmount: 100,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(959))).toEqual({
      catchType: "coins",
      coinAmount: 100,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(960))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 35,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(979))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 35,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(980))).toEqual({
      catchType: "bank",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 200,
    });
    expect(resolveCatch(rng(999))).toEqual({
      catchType: "bank",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 200,
    });
  });
});

describe("resolveCatch distribution", () => {
  it("hits declared chances within ±0.5pp over 100k catches", () => {
    // Детерминированный LCG — повторяемость без внешнего рандома (паттерн из roulette.spec.ts).
    const lcg = (seed: number) => {
      let state = seed >>> 0;
      return (maxExclusive: number): number => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state % maxExclusive;
      };
    };

    const rng = lcg(0xf1c04a7);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100_000; i++) {
      const category = pickWeighted(FISH_CATCH_WEIGHTS, rng);
      counts[category] = (counts[category] ?? 0) + 1;
    }

    const declaredChances = {
      empty: 45,
      coins8: 30,
      coins20: 12,
      xp10: 6,
      coins100: 3,
      xp35: 2,
      bank200: 2,
    };

    for (const [category, chance] of Object.entries(declaredChances)) {
      const rate = ((counts[category] ?? 0) / 100_000) * 100;
      expect(Math.abs(rate - chance)).toBeLessThan(0.5);
    }
  });
});