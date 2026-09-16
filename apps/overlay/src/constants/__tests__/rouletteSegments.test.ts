import { describe, expect, it } from 'vitest';
import { SEGMENT_CATALOG, prizeToSegmentId } from '../rouletteSegments';
import { RARITY_STYLES, SEGMENT_RARITY, type RouletteRarity } from '../rarityTiers';
import { TAPE_PRIZE_WEIGHTS, TAPE_SEGMENT_IDS, TAPE_STRIP_LENGTH, TAPE_WINNER_INDEX } from '../tapeStrip';

const ALL_SEGMENT_IDS = [
  'empty',
  'coins30',
  'coins60',
  'coins100',
  'coins250',
  'xp35',
  'jackpot',
] as const;

describe('rouletteSegments', () => {
  it('catalog covers every segment id exactly once', () => {
    const catalog = Object.keys(SEGMENT_CATALOG);
    expect(catalog).toHaveLength(ALL_SEGMENT_IDS.length);
    expect(new Set(catalog)).toHaveLength(ALL_SEGMENT_IDS.length);
    for (const id of ALL_SEGMENT_IDS) {
      expect(catalog).toContain(id);
    }
  });

  it('prizeToSegmentId maps every prize type', () => {
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 60, xpAmount: 0 })).toBe('coins60');
    expect(prizeToSegmentId({ prizeType: 'xp', coinAmount: 0, xpAmount: 35 })).toBe('xp35');
    expect(prizeToSegmentId({ prizeType: 'jackpot', coinAmount: 9000, xpAmount: 0 })).toBe('jackpot');
    expect(prizeToSegmentId({ prizeType: 'empty', coinAmount: 0, xpAmount: 0 })).toBe('empty');
  });
});

describe('rarityTiers', () => {
  it('SEGMENT_RARITY covers every segment id', () => {
    for (const id of ALL_SEGMENT_IDS) {
      expect(SEGMENT_RARITY[id], `missing rarity for ${id}`).toBeDefined();
    }
  });

  it('RARITY_STYLES covers every rarity', () => {
    const rarities: readonly RouletteRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const rarity of rarities) {
      expect(RARITY_STYLES[rarity], `missing style for ${rarity}`).toBeDefined();
    }
  });
});

describe('tapeStrip', () => {
  it('strip is odd and winner sits at the exact center', () => {
    expect(TAPE_STRIP_LENGTH % 2).toBe(1);
    expect(TAPE_WINNER_INDEX).toBe(Math.floor(TAPE_STRIP_LENGTH / 2));
  });

  it('weights mirror the backend pool, summing to 1000', () => {
    expect(TAPE_SEGMENT_IDS).toHaveLength(ALL_SEGMENT_IDS.length);
    const total = TAPE_SEGMENT_IDS.reduce(
      (sum, id) => sum + (TAPE_PRIZE_WEIGHTS[id] ?? 0),
      0,
    );
    expect(total).toBe(1000);
  });
});
