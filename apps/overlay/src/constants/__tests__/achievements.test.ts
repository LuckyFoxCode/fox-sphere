import { describe, expect, it } from 'vitest';
import type { ProfileShowPayload } from '@fox-sphere/types';
import {
  getWatchStreakAchievement,
  getWatchStreakMilestone,
  PROFILE_ACHIEVEMENT_SLOTS,
} from '../achievements';

const url = (milestone: number) => `/assets/achievements/watch-streak/streak-${milestone}.webp`;

const resolveWatchStreakSlot = PROFILE_ACHIEVEMENT_SLOTS[0];

if (!resolveWatchStreakSlot) throw new Error('slot 0 is the watch-streak slot');

const profile = (bestStreak: number | null): ProfileShowPayload => ({
  username: 'viewer',
  displayName: 'Viewer',
  color: '#9146FF',
  userId: '42',
  lvl: 1,
  xp: 0,
  coins: 0,
  heroId: null,
  heroLevel: null,
  bestStreak,
  goldenBeers: 0,
  isMod: false,
  isFounder: false,
  isSubscriber: false,
  isPermanentVip: false,
  isLuckyVip: false,
  isBroadcaster: false,
});

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

describe('getWatchStreakMilestone', () => {
  it('returns the milestone itself for an exact hit', () => {
    expect(getWatchStreakMilestone(45)).toBe(45);
  });

  it('returns the lower milestone in between', () => {
    expect(getWatchStreakMilestone(40)).toBe(30);
  });

  it('returns null below the first milestone', () => {
    expect(getWatchStreakMilestone(0)).toBeNull();
  });
});

describe('profile achievement slot 0', () => {
  it('renders the badge for the best streak reached', () => {
    expect(resolveWatchStreakSlot(profile(45))).toEqual({
      key: 'watch-streak',
      src: url(45),
      label: 'watch streak 45',
    });
  });

  it('labels the badge with the milestone shown, not the raw best streak', () => {
    expect(resolveWatchStreakSlot(profile(40))?.label).toBe('watch streak 30');
  });

  it('leaves the slot empty when no milestone was ever awarded', () => {
    expect(resolveWatchStreakSlot(profile(null))).toBeNull();
    expect(resolveWatchStreakSlot(profile(2))).toBeNull();
  });
});
