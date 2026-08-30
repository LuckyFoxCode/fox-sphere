import { describe, expect, it } from "vitest";
import { getXpThresholdForLevel, resolveActiveXpBoost } from "../xp";

describe("getXpThresholdForLevel", () => {
  it("is cumulative: each level costs its own number times the step", () => {
    expect(getXpThresholdForLevel(0)).toBe(0);
    expect(getXpThresholdForLevel(1)).toBe(100);
    expect(getXpThresholdForLevel(2)).toBe(300); // 100 + 200
    expect(getXpThresholdForLevel(3)).toBe(600); // 100 + 200 + 300
  });

  it("scales with the step", () => {
    expect(getXpThresholdForLevel(3, 10)).toBe(60);
  });

  it("never decreases as the level rises", () => {
    let previous = -1;
    for (let level = 0; level <= 50; level++) {
      const threshold = getXpThresholdForLevel(level);
      expect(threshold).toBeGreaterThan(previous);
      previous = threshold;
    }
  });
});

describe("resolveActiveXpBoost", () => {
  it("returns null when no boost was ever set", () => {
    expect(
      resolveActiveXpBoost({ xpBoostExpiresAt: null, xpBoostMultiplier: 2 }),
    ).toBeNull();
  });

  it("returns null once the boost has expired", () => {
    expect(
      resolveActiveXpBoost({
        xpBoostExpiresAt: new Date(Date.now() - 1_000),
        xpBoostMultiplier: 2,
      }),
    ).toBeNull();
  });

  it("treats the exact expiry instant as expired, not active", () => {
    expect(
      resolveActiveXpBoost({
        xpBoostExpiresAt: new Date(Date.now()),
        xpBoostMultiplier: 2,
      }),
    ).toBeNull();
  });

  it("returns the multiplier while the boost is live", () => {
    const expiresAt = new Date(Date.now() + 60_000);

    expect(
      resolveActiveXpBoost({ xpBoostExpiresAt: expiresAt, xpBoostMultiplier: 3 }),
    ).toEqual({ multiplier: 3, expiresAt: expiresAt.getTime() });
  });
});
