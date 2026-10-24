import { describe, expect, it } from "vitest";
import { pickWeighted } from "../random";
import { PIVO_OUTCOME_WEIGHTS, resolvePivoOutcome } from "../pivo";

const at = (roll: number) => () => roll;

describe("PIVO_OUTCOME_WEIGHTS", () => {
  it("declares 50 golden in 1000", () => {
    const total = Object.values(PIVO_OUTCOME_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(1000);
    expect(PIVO_OUTCOME_WEIGHTS.golden).toBe(50);
  });
});

describe("resolvePivoOutcome boundaries", () => {
  it("answers regular for rolls 0..949", () => {
    expect(resolvePivoOutcome(at(0))).toBe("regular");
    expect(resolvePivoOutcome(at(949))).toBe("regular");
  });

  it("answers golden for rolls 950..999", () => {
    expect(resolvePivoOutcome(at(950))).toBe("golden");
    expect(resolvePivoOutcome(at(999))).toBe("golden");
  });
});

describe("resolvePivoOutcome distribution", () => {
  it("hits 5% within ±0.5pp over 100k rolls", () => {
    // Deterministic LCG - same pattern as roulette.spec.ts, repeatable without external randomness.
    const lcg = (seed: number) => {
      let state = seed >>> 0;
      return (maxExclusive: number): number => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state % maxExclusive;
      };
    };

    const rng = lcg(0x5eedf00d);
    let golden = 0;

    for (let i = 0; i < 100_000; i++) {
      if (pickWeighted(PIVO_OUTCOME_WEIGHTS, rng) === "golden") golden++;
    }

    expect(golden / 1000).toBeGreaterThanOrEqual(4.5);
    expect(golden / 1000).toBeLessThanOrEqual(5.5);
  });
});
