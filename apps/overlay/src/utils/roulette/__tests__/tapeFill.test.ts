import { describe, expect, it } from 'vitest';
import { TAPE_PRIZE_WEIGHTS, TAPE_SEGMENT_IDS, TAPE_STRIP_LENGTH, TAPE_WINNER_INDEX } from '@/constants/tapeStrip';
import type { RouletteSegmentId } from '@/constants/rouletteSegments';
import { buildTapeStrip } from '../tapeFill';

const WINNER_IDS: readonly RouletteSegmentId[] = [
  'empty',
  'coins30',
  'coins60',
  'coins100',
  'coins250',
  'xp35',
  'jackpot',
];

// Детерминированный LCG в [0,1). Постоянный random (например 0.5) всегда даёт
// один и тот же id (0.5 попадает в кумулятивный диапазон coins30), из-за чего
// rejection sampling в drawSegment не может выйти из запрета и зависает. LCG
// сохраняет детерминизм, но позволяет броскам меняться.
const seededUniform = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const uniform = seededUniform(123456789);

describe('buildTapeStrip', () => {
  it('forces the winner to the exact center index', () => {
    for (const winnerId of WINNER_IDS) {
      const strip = buildTapeStrip(winnerId, uniform);
      expect(strip[TAPE_WINNER_INDEX]?.id).toBe(winnerId);
      expect(strip).toHaveLength(TAPE_STRIP_LENGTH);
    }
  });

  it('never places two identical segments side by side', () => {
    const strip = buildTapeStrip('jackpot');
    for (let i = 0; i < strip.length - 1; i++) {
      expect(strip[i]?.id, `adjacent dup at ${i}`).not.toBe(strip[i + 1]?.id);
    }
  });

  it('is deterministic for a fixed random sequence', () => {
    const first = buildTapeStrip('coins100', seededUniform(42));
    const second = buildTapeStrip('coins100', seededUniform(42));
    expect(first).toEqual(second);
  });

  it('mirrors the backend weights across 100k spins of forbid-free slots', () => {
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100_000; i++) {
      const strip = buildTapeStrip('coins30');
      const first = strip[0]?.id;
      const firstRight = strip[11]?.id;
      if (first !== undefined) counts[first] = (counts[first] ?? 0) + 1;
      if (firstRight !== undefined) counts[firstRight] = (counts[firstRight] ?? 0) + 1;
    }

    // Правило «без двух одинаковых подряд» смещает маргинальные доли в
    // остальных слотах, поэтому распределение равно сырым весам только там,
    // где запрета нет: индекс 0 (левый край) и индекс 11 (начало правой части).
    const total = 100_000 * 2;

    for (const id of TAPE_SEGMENT_IDS) {
      const expected = (TAPE_PRIZE_WEIGHTS[id] ?? 0) / 1000;
      const actual = (counts[id] ?? 0) / total;
      expect(
        actual,
        `segment ${id}: got ${actual.toFixed(4)}, expected ~${expected.toFixed(4)}`,
      ).toBeGreaterThan(expected - 0.005);
      expect(actual).toBeLessThan(expected + 0.005);
    }
  });
});
