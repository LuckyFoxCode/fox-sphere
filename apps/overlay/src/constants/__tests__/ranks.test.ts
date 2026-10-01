import { describe, expect, it } from 'vitest';
import { getRankConfigByLevel, RANK_BADGES, RANK_TIERS } from '../ranks';

describe('getRankConfigByLevel', () => {
  it('resolves each rank across its level band', () => {
    expect(getRankConfigByLevel(1).rankTitle).toBe('NEWBIE');
    expect(getRankConfigByLevel(5).rankTitle).toBe('NEWBIE');
    expect(getRankConfigByLevel(6).rankTitle).toBe('ROOKIE');
    expect(getRankConfigByLevel(94).rankTitle).toBe('LEGEND');
    expect(getRankConfigByLevel(95).rankTitle).toBe('MYTHIC');
    expect(getRankConfigByLevel(99).rankTitle).toBe('SUPREME');
    expect(getRankConfigByLevel(100).rankTitle).toBe('OVERLORD');
  });

  it('keeps level 100+ on the top rank', () => {
    expect(getRankConfigByLevel(250).rankTitle).toBe('OVERLORD');
  });

  it('falls back to the first rank for a missing level', () => {
    expect(getRankConfigByLevel(undefined).rankTitle).toBe('NEWBIE');
  });

  it('overrides the rank for the broadcaster', () => {
    expect(getRankConfigByLevel(100, true).rankTitle).toBe('GAME MASTER');
    expect(getRankConfigByLevel(undefined, true).rankTitle).toBe('GAME MASTER');
  });

  it('overrides the rank for the bot', () => {
    expect(getRankConfigByLevel(100, false, true).rankTitle).toBe('SYSTEM BOT');
  });

  it('gives the broadcaster precedence over the bot flag', () => {
    expect(getRankConfigByLevel(1, true, true).rankTitle).toBe('GAME MASTER');
  });

  it('carries the tier gradient onto every rank', () => {
    expect(getRankConfigByLevel(1).gradient).toBe(RANK_TIERS[1].gradient);
    expect(getRankConfigByLevel(100).gradient).toBe(RANK_TIERS[10].gradient);
  });
});

describe('rank badge lookup', () => {
  const badgeTier = (level: number) => Math.min(getRankConfigByLevel(level).tier, 9);

  it('maps every level to an existing badge icon', () => {
    for (let level = 1; level <= 120; level += 1) {
      expect(RANK_BADGES[badgeTier(level)]).toBeDefined();
    }
  });

  it('clamps the top tier onto the last badge', () => {
    expect(badgeTier(100)).toBe(9);
    expect(badgeTier(500)).toBe(9);
  });

  it('distinguishes lower tiers', () => {
    expect(badgeTier(1)).toBe(1);
    expect(badgeTier(15)).toBe(2);
    expect(badgeTier(25)).toBe(3);
    expect(badgeTier(75)).toBe(6);
  });

  it('reuses one badge per tier', () => {
    expect(badgeTier(1)).toBe(badgeTier(8));
    expect(RANK_BADGES[badgeTier(1)]).toBe(RANK_BADGES[badgeTier(8)]);
  });
});
