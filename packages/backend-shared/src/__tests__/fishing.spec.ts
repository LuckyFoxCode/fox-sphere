import { describe, expect, it } from "vitest";
import { pickWeighted } from "../random";
import { FISH_CATCH_WEIGHTS, resolveCatch } from "../fishing";

describe("resolveCatch", () => {
  // Обе границы каждого диапазона: `pickWeighted` возвращает первое значение, у которого
  // накопительная сумма превысила бросок, поэтому сдвиг любого веса на единицу меняет пару
  // соседних ассертов. Сумма весов = 1000, диапазоны: empty 0..219, coins25 220..519,
  // coins70 520..619, coins100 620..627, xp20 628..877, xp60 878..974, bank200 975..999.
  it("maps exact boundaries of each weight", () => {
    const rng = (value: number) => () => value;

    expect(resolveCatch(rng(0))).toEqual({
      catchType: "empty",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(219))).toEqual({
      catchType: "empty",
      coinAmount: 0,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(220))).toEqual({
      catchType: "coins",
      coinAmount: 25,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(519))).toEqual({
      catchType: "coins",
      coinAmount: 25,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(520))).toEqual({
      catchType: "coins",
      coinAmount: 70,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(619))).toEqual({
      catchType: "coins",
      coinAmount: 70,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(620))).toEqual({
      catchType: "coins",
      coinAmount: 100,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(627))).toEqual({
      catchType: "coins",
      coinAmount: 100,
      xpAmount: 0,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(628))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 20,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(877))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 20,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(878))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 60,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(974))).toEqual({
      catchType: "xp",
      coinAmount: 0,
      xpAmount: 60,
      bankAmount: 0,
    });
    expect(resolveCatch(rng(975))).toEqual({
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

  // Сумма обязана быть ровно 1000: `pickWeighted` бросает кубик в [0, total) и делит на сумму,
  // поэтому 1001 превратила бы последний сегмент в недостижимый, а 999 сдвинула бы границы.
  it("sums the weights to 1000", () => {
    const total = Object.values(FISH_CATCH_WEIGHTS).reduce((sum, w) => sum + w, 0);

    expect(total).toBe(1000);
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

    // Редкие исходы проверяются с той же допуском ±0.5 п.п., что и частые: на 100k бросков
    // 0.8% — это 800 попаданий, а полуотклонение в 500 заведомо не достигается.
    const declaredChances = {
      empty: 22,
      coins25: 30,
      coins70: 10,
      coins100: 0.8,
      xp20: 25,
      xp60: 9.7,
      bank200: 2.5,
    };

    for (const [category, chance] of Object.entries(declaredChances)) {
      const rate = ((counts[category] ?? 0) / 100_000) * 100;
      expect(Math.abs(rate - chance)).toBeLessThan(0.5);
    }
  });
});
