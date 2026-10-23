import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGoldenBeerTier, PIVO_TIER_COUNT, type ProfileShowPayload } from '@fox-sphere/types';
import {
  getGoldenBeerTierLabel,
  getWatchStreakAchievement,
  getWatchStreakMilestone,
  pivoTierAchievementPath,
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

const pivoUrl = (tier: number) => `/assets/achievements/pivo/tier-${tier}.webp`;

const resolveGoldenBeerSlot = PROFILE_ACHIEVEMENT_SLOTS[1];

if (!resolveGoldenBeerSlot) throw new Error('slot 1 is the golden-beer slot');

const pivoProfile = (goldenBeers: number): ProfileShowPayload => ({ ...profile(null), goldenBeers });

describe('getGoldenBeerTier', () => {
  it('answers 0 below the first threshold and for a corrupt count', () => {
    expect(getGoldenBeerTier(0)).toBe(0);
    expect(getGoldenBeerTier(NaN)).toBe(0);
    expect(getGoldenBeerTier(-3)).toBe(0);
    expect(getGoldenBeerTier(0.5)).toBe(0);
    expect(getGoldenBeerTier(2.5)).toBe(0);
  });

  it('answers the tier at and between thresholds', () => {
    expect(getGoldenBeerTier(1)).toBe(1);
    expect(getGoldenBeerTier(2)).toBe(2);
    expect(getGoldenBeerTier(3)).toBe(2);
    expect(getGoldenBeerTier(4)).toBe(3);
    expect(getGoldenBeerTier(7)).toBe(4);
    expect(getGoldenBeerTier(13)).toBe(5);
  });

  it('stays on the top tier past the last threshold', () => {
    expect(getGoldenBeerTier(14)).toBe(5);
    expect(getGoldenBeerTier(900)).toBe(5);
  });
});

describe('pivo tier art', () => {
  it('maps every tier to its own file, and every file exists on disk', () => {
    for (let tier = 1; tier <= PIVO_TIER_COUNT; tier++) {
      const src = pivoTierAchievementPath(tier);
      expect(src).toBe(pivoUrl(tier));
      expect(existsSync(join(process.cwd(), 'public', src)), src).toBe(true);
    }
  });

  it('labels all five tiers', () => {
    expect([1, 2, 3, 4, 5].map(getGoldenBeerTierLabel)).toEqual([
      'fresh',
      'dark',
      'aged',
      'golden',
      'legendary',
    ]);
  });
});

describe('profile achievement slot 1', () => {
  it('renders the badge of the tier reached, labelled with the raw count', () => {
    expect(resolveGoldenBeerSlot(pivoProfile(9))).toEqual({
      key: 'golden-beer',
      src: pivoUrl(4),
      label: 'golden beer x9',
    });
  });

  it('keeps the top badge past the last threshold', () => {
    expect(resolveGoldenBeerSlot(pivoProfile(40))?.src).toBe(pivoUrl(5));
  });

  it('leaves the slot empty for a viewer with no golden beer', () => {
    expect(resolveGoldenBeerSlot(pivoProfile(0))).toBeNull();
  });
});
