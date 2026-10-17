import { describe, expect, it } from 'vitest';
import { SEGMENT_CATALOG, prizeToSegmentId } from '../rouletteSegments';
import { RARITY_STYLES, SEGMENT_RARITY, type RouletteRarity } from '../rarityTiers';
import { TAPE_PRIZE_WEIGHTS, TAPE_SEGMENT_IDS, TAPE_STRIP_LENGTH, TAPE_WINNER_INDEX } from '../tapeStrip';

const ALL_SEGMENT_IDS = [
  'empty',
  'coins60',
  'coins75',
  'coins100',
  'coins250',
  'coins500',
  'coins1000',
  'xp35',
  'xp100',
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
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 75, xpAmount: 0 })).toBe('coins75');
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 100, xpAmount: 0 })).toBe('coins100');
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 250, xpAmount: 0 })).toBe('coins250');
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 500, xpAmount: 0 })).toBe('coins500');
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 1000, xpAmount: 0 })).toBe(
      'coins1000',
    );
    expect(prizeToSegmentId({ prizeType: 'xp', coinAmount: 0, xpAmount: 35 })).toBe('xp35');
    expect(prizeToSegmentId({ prizeType: 'xp', coinAmount: 0, xpAmount: 100 })).toBe('xp100');
    expect(prizeToSegmentId({ prizeType: 'jackpot', coinAmount: 9000, xpAmount: 0 })).toBe('jackpot');
    expect(prizeToSegmentId({ prizeType: 'empty', coinAmount: 0, xpAmount: 0 })).toBe('empty');
  });

  it('prizeToSegmentId checks jackpot before coins, because jackpot pays the whole bank', () => {
    // Банк джекпота (~10 990) не совпадает ни с одной сегментной суммой, поэтому при
    // проверке монет раньше джекпота он ушёл бы в поиск по карте и вернул 'empty'.
    expect(prizeToSegmentId({ prizeType: 'jackpot', coinAmount: 10990, xpAmount: 0 })).toBe(
      'jackpot',
    );
  });

  it('prizeToSegmentId falls back to empty on an amount outside the catalog', () => {
    // Приз из будущего сегмента или битый payload сокета: лента обязана показать валидную
    // карточку, а не упасть и не отрисовать пустоту.
    expect(prizeToSegmentId({ prizeType: 'coins', coinAmount: 777, xpAmount: 0 })).toBe('empty');
    expect(prizeToSegmentId({ prizeType: 'xp', coinAmount: 0, xpAmount: 60 })).toBe('empty');
  });

  // The two lookup maps are `Record<number, …>`, so the compiler cannot tell that a segment added
  // to the union forgot its entry: `prizeToSegmentId` would answer 'empty' and the tape would draw
  // 🎲 for a win — the quiet version of the bug this file already caught twice. The amounts are
  // parsed back out of the ids, so the check is exhaustive against the union rather than against
  // another hand-kept list, and `checked` keeps a renamed id format from passing vacuously.
  it('every coins and xp segment id resolves to itself', () => {
    let checked = 0;

    for (const id of ALL_SEGMENT_IDS) {
      const coins = /^coins(\d+)$/.exec(id)?.[1];
      const xp = /^xp(\d+)$/.exec(id)?.[1];

      if (coins !== undefined) {
        checked += 1;
        expect(
          prizeToSegmentId({ prizeType: 'coins', coinAmount: Number(coins), xpAmount: 0 }),
        ).toBe(id);
      }

      if (xp !== undefined) {
        checked += 1;
        expect(prizeToSegmentId({ prizeType: 'xp', coinAmount: 0, xpAmount: Number(xp) })).toBe(id);
      }
    }

    expect(checked).toBe(8);
  });
});

describe('rarityTiers', () => {
  it('SEGMENT_RARITY covers every segment id', () => {
    for (const id of ALL_SEGMENT_IDS) {
      expect(SEGMENT_RARITY[id], `missing rarity for ${id}`).toBeDefined();
    }
  });

  it('RARITY_STYLES covers every rarity', () => {
    const rarities: readonly RouletteRarity[] = [
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
      'mythic',
    ];
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

  // Named for what it checks. This is NOT a check against the backend pool: the overlay cannot
  // import `backend-shared` (Prisma in a browser bundle), so `TAPE_PRIZE_WEIGHTS` is a hand-kept
  // mirror and nothing here compares the two. Syncing it is a manual `diff` (see the comment on
  // `TAPE_PRIZE_WEIGHTS`), and a test that only reads its own table would pass on a mirror that had
  // drifted by 100%. What is checked here is internal: every segment has a weight and they sum to
  // the 1000 `pickWeighted` divides by.
  it('gives every segment a weight, and they sum to 1000', () => {
    expect(TAPE_SEGMENT_IDS).toHaveLength(ALL_SEGMENT_IDS.length);
    const total = TAPE_SEGMENT_IDS.reduce(
      (sum, id) => sum + (TAPE_PRIZE_WEIGHTS[id] ?? 0),
      0,
    );
    expect(total).toBe(1000);
  });
});
