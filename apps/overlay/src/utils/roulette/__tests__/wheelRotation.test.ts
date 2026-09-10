import { describe, expect, it } from 'vitest';
import { computeWheelRotation, pickSegmentIndex, segmentCenterAngle } from '../wheelRotation';

const fourSegments = [{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }];

// random() => 0.5 даёт нулевой джиттер и первый индекс — детерминизм для проверок углов.
const zeroJitter = () => 0.5;

// Указатель сверху (0°): точка колеса под указателем = (-rotation) mod 360.
const landingAngle = (rotation: number): number =>
  (((-rotation) % 360) + 360) % 360;

describe('segmentCenterAngle', () => {
  it('returns the middle angle of each segment', () => {
    expect(segmentCenterAngle(0, 4)).toBe(45);
    expect(segmentCenterAngle(1, 4)).toBe(135);
    expect(segmentCenterAngle(3, 12)).toBe(105);
  });
});

describe('pickSegmentIndex', () => {
  it('returns null when no segment matches the id', () => {
    expect(pickSegmentIndex(fourSegments, 'missing', zeroJitter)).toBeNull();
  });

  it('picks among matching segments only', () => {
    // random() => 0 → первый совпавший (индекс 0), random() => 0.999 → последний (индекс 2).
    expect(pickSegmentIndex(fourSegments, 'a', () => 0)).toBe(0);
    expect(pickSegmentIndex(fourSegments, 'a', () => 0.999)).toBe(2);
    expect(pickSegmentIndex(fourSegments, 'c', zeroJitter)).toBe(3);
  });
});

describe('computeWheelRotation', () => {
  it('lands the winning segment center under the top pointer', () => {
    // 4 сегмента, цель 0 → центр 45°; указатель 0° → финальная позиция 315° (mod 360).
    const rotation = computeWheelRotation(0, 0, 4, 2, zeroJitter);
    expect(rotation).toBe(720 + 315);
    expect(landingAngle(rotation)).toBeCloseTo(45);
  });

  it('always rotates forward past the current rotation', () => {
    const rotation = computeWheelRotation(800, 2, 4, 2, zeroJitter);
    expect(rotation).toBeGreaterThan(800);
  });

  it('accounts for the current rotation modulo', () => {
    const rotation = computeWheelRotation(800, 1, 4, 2, zeroJitter);
    // центр сегмента 1 = 135°; посадочная точка колеса под указателем = центр.
    expect(landingAngle(rotation)).toBeCloseTo(135);
  });

  it('keeps jitter inside the winning segment', () => {
    const segmentCount = 12;
    const segmentAngle = 360 / segmentCount;

    for (const random of [() => 0, () => 1, () => 0.25, () => 0.75]) {
      const rotation = computeWheelRotation(1234, 5, segmentCount, 3, random);
      const landing = landingAngle(rotation);
      const center = segmentCenterAngle(5, segmentCount);
      const distance = Math.abs((((landing - center + 540) % 360) - 180));
      expect(distance).toBeLessThan(segmentAngle / 2);
    }
  });
});
