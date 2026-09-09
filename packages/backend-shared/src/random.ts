import { randomInt } from "node:crypto";

export const secureRandomInt = (maxExclusive: number): number =>
  randomInt(maxExclusive);

export const pickWeighted = <T extends string>(
  weights: Record<T, number>,
  rng: (maxExclusive: number) => number = secureRandomInt,
): T => {
  const totalWeight = (Object.values(weights) as number[]).reduce((sum, weight) => sum + weight, 0);
  const roll = rng(totalWeight);

  let cumulative = 0;
  for (const [value, weight] of Object.entries(weights) as [T, number][]) {
    cumulative += weight;
    if (roll < cumulative) return value;
  }

  return Object.keys(weights)[Object.keys(weights).length - 1] as T;
};