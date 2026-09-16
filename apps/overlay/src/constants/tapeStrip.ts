import type { RouletteSegmentId } from './rouletteSegments';

export const TAPE_STRIP_LENGTH = 21;
export const TAPE_WINNER_INDEX = 10;
export const TAPE_VISIBLE_COUNT = 5;
export const TAPE_CARD_WIDTH_PX = 72;
export const TAPE_VIEWPORT_WIDTH_PX = TAPE_CARD_WIDTH_PX * TAPE_VISIBLE_COUNT;

// Веса ленты = зеркало ROULETTE_PRIZE_WEIGHTS из packages/backend-shared (сумма 1000).
export const TAPE_PRIZE_WEIGHTS: Record<RouletteSegmentId, number> = {
  empty: 220,
  coins30: 300,
  coins60: 200,
  coins100: 130,
  coins250: 90,
  xp35: 59,
  jackpot: 1,
};

export const TAPE_SEGMENT_IDS: readonly RouletteSegmentId[] = [
  'empty',
  'coins30',
  'coins60',
  'coins100',
  'coins250',
  'xp35',
  'jackpot',
];

export const TAPE_PRIZE_WEIGHT_LIST: readonly number[] = TAPE_SEGMENT_IDS.map(
  (id) => TAPE_PRIZE_WEIGHTS[id] ?? 0,
);
