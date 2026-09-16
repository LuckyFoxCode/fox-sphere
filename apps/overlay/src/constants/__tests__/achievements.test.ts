import { describe, expect, it } from 'vitest';
import { getWatchStreakAchievement } from '../achievements';

const url = (milestone: number) => `/assets/achievements/watch-streak/streak-${milestone}.webp`;

describe('getWatchStreakAchievement', () => {
  it('returns the exact image for each milestone', () => {
    for (const m of [3, 5, 7, 10, 15, 20, 30, 45, 60, 80, 100]) {
      expect(getWatchStreakAchievement(m)).toBe(url(m));
    }
  });

  it('returns the last achieved image between milestones', () => {
    expect(getWatchStreakAchievement(23)).toBe(url(20));
    expect(getWatchStreakAchievement(35)).toBe(url(30));
    expect(getWatchStreakAchievement(47)).toBe(url(45));
    expect(getWatchStreakAchievement(59)).toBe(url(45));
  });

  it('repeats the top image past 100', () => {
    expect(getWatchStreakAchievement(101)).toBe(url(100));
    expect(getWatchStreakAchievement(150)).toBe(url(100));
  });

  it('returns null for non-finite values', () => {
    expect(getWatchStreakAchievement(NaN)).toBeNull();
    expect(getWatchStreakAchievement(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('returns null below the first milestone', () => {
    expect(getWatchStreakAchievement(2)).toBeNull();
    expect(getWatchStreakAchievement(0)).toBeNull();
  });
});
