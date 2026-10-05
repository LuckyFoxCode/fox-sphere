import type { MovementTarget } from '../movement';
import { describe, expect, it } from 'vitest';
import {
  MAX_ANIM_TIME_SCALE,
  MIN_ANIM_TIME_SCALE,
  calculateAnimTimeScale,
  nextWanderStep,
} from '../movement';

const ALWAYS_WALK = () => 0.9;
const NEVER_WALK = () => 0.1;

const expectStep = (step: MovementTarget | null): MovementTarget => {
  if (!step) throw new Error('expected a wander step, got null');

  return step;
};

describe('nextWanderStep', () => {
  it('stands still when the coin flip says wait', () => {
    expect(nextWanderStep(50, 1, NEVER_WALK)).toBeNull();
  });

  it('takes a step when the coin flip says walk', () => {
    const step = expectStep(nextWanderStep(50, 1, ALWAYS_WALK));

    expect(step.actualDistance).toBeGreaterThan(0);
    expect(step.newX).toBeGreaterThanOrEqual(5);
    expect(step.newX).toBeLessThanOrEqual(95);
  });

  it('never returns a step shorter than the duration floor allows', () => {
    for (let i = 0; i < 200; i++) {
      const step = expectStep(nextWanderStep(50, i % 2 === 0 ? 1 : -1, ALWAYS_WALK));

      expect(step.moveDuration).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('turns around at the right bound instead of walking off the lane', () => {
    const step = expectStep(nextWanderStep(95, 1, ALWAYS_WALK));

    expect(step.newDirection).toBe(-1);
    expect(step.newX).toBeLessThan(95);
  });

  it('turns around at the left bound instead of walking off the lane', () => {
    const step = expectStep(nextWanderStep(5, -1, ALWAYS_WALK));

    expect(step.newDirection).toBe(1);
    expect(step.newX).toBeGreaterThan(5);
  });

  it('keeps its direction mid-lane', () => {
    for (let i = 0; i < 200; i++) {
      expect(expectStep(nextWanderStep(50, 1, ALWAYS_WALK)).newDirection).toBe(1);
      expect(expectStep(nextWanderStep(50, -1, ALWAYS_WALK)).newDirection).toBe(-1);
    }
  });

  it('falls back to Math.random when no rng is injected', () => {
    const results = Array.from({ length: 50 }, () => nextWanderStep(50, 1));

    expect(results.some((step) => step === null)).toBe(true);
    expect(results.some((step) => step !== null)).toBe(true);
  });
});

describe('calculateAnimTimeScale', () => {
  const step = (actualDistance: number, moveDuration: number): MovementTarget => ({
    newX: 50,
    newDirection: 1,
    moveDuration,
    actualDistance,
  });

  it('plays the cycle at its authored frame rate for a nominal step', () => {
    expect(calculateAnimTimeScale(step(8, 3.6))).toBeCloseTo(1, 5);
    expect(calculateAnimTimeScale(step(25, 11.25))).toBeCloseTo(1, 5);
  });

  it('slows the cycle down for a micro step that hit the duration floor', () => {
    expect(calculateAnimTimeScale(step(1, 1.5))).toBe(MIN_ANIM_TIME_SCALE);
    expect(calculateAnimTimeScale(step(2, 1.5))).toBeLessThan(1);
  });

  it('speeds the cycle up for a step faster than any calculateNextStep produces', () => {
    expect(calculateAnimTimeScale(step(20, 1.5))).toBe(MAX_ANIM_TIME_SCALE);
  });

  it('clamps instead of crawling on an absurdly slow step', () => {
    expect(calculateAnimTimeScale(step(25, 1000))).toBe(MIN_ANIM_TIME_SCALE);
  });

  it('never leaves the clamp range for any step calculateNextStep can produce', () => {
    for (let distance = 1; distance <= 25; distance++) {
      const moveDuration = Math.max(1.5, Number((distance * 0.45).toFixed(1)));
      const timeScale = calculateAnimTimeScale(step(distance, moveDuration));

      expect(timeScale).toBeGreaterThanOrEqual(MIN_ANIM_TIME_SCALE);
      expect(timeScale).toBeLessThanOrEqual(MAX_ANIM_TIME_SCALE);
    }
  });
});
