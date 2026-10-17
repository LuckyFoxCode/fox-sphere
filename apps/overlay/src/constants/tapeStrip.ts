import type { RouletteSegmentId } from './rouletteSegments';

export const TAPE_STRIP_LENGTH = 21;
export const TAPE_WINNER_INDEX = 10;
export const TAPE_VISIBLE_COUNT = 5;
export const TAPE_CARD_WIDTH_PX = 144;
export const TAPE_CARD_HEIGHT_PX = 110;
export const TAPE_CARD_GAP_PX = 12;
export const TAPE_VIEWPORT_WIDTH_PX =
  (TAPE_CARD_WIDTH_PX + TAPE_CARD_GAP_PX) * TAPE_VISIBLE_COUNT - TAPE_CARD_GAP_PX;

// Веса ленты = зеркало ROULETTE_PRIZE_WEIGHTS из packages/backend-shared (сумма 1000).
// Синхронизируется вручную: оверлей не может импортировать backend-shared (там Prisma).
export const TAPE_PRIZE_WEIGHTS: Record<RouletteSegmentId, number> = {
  empty: 220,
  coins60: 150,
  coins75: 60,
  coins100: 355,
  coins250: 80,
  coins500: 20,
  coins1000: 5,
  xp35: 75,
  xp100: 34,
  jackpot: 1,
};

export const TAPE_SEGMENT_IDS: readonly RouletteSegmentId[] = [
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
];

export const TAPE_PRIZE_WEIGHT_LIST: readonly number[] = TAPE_SEGMENT_IDS.map(
  (id) => TAPE_PRIZE_WEIGHTS[id] ?? 0,
);
