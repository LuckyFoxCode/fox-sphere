import {
  SEGMENT_CATALOG,
  TAPE_PRIZE_WEIGHT_LIST,
  TAPE_SEGMENT_IDS,
  TAPE_STRIP_LENGTH,
  TAPE_WINNER_INDEX,
} from '@/constants';
import type { RouletteSegmentId, RouletteWheelSegment } from '@/constants';

// Клиентский аналог pickWeighted из packages/backend-shared: кумулятивный выбор.
export const pickWeighted = <T>(
  entries: readonly T[],
  weights: readonly number[],
  random: () => number = Math.random,
): T => {
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  let result: T | undefined;

  for (let i = 0; i < entries.length; i++) {
    const weight = weights[i] ?? 0;
    if (roll < weight) {
      result = entries[i];
      break;
    }
    roll -= weight;
  }

  if (result === undefined) throw new Error('pickWeighted: total weight is zero');
  return result;
};

// Тянет id, отличный от forbidId; на границе с победителем forbid нет (спека).
const drawSegment = (
  forbidId: RouletteSegmentId | undefined,
  random: () => number,
): RouletteSegmentId => {
  while (true) {
    const id = pickWeighted(TAPE_SEGMENT_IDS, TAPE_PRIZE_WEIGHT_LIST, random);
    if (id !== forbidId) return id;
  }
};

// 21 слот: 10 соседей слева, 10 справа от выигрышного. Ограничение «не два подряд
// одинаковых» применяется только между двумя выбранными случайно слотaми.
export const buildTapeStrip = (
  winnerId: RouletteSegmentId,
  random: () => number = Math.random,
): RouletteWheelSegment[] => {
  const strip: RouletteSegmentId[] = Array.from<RouletteSegmentId>({ length: TAPE_STRIP_LENGTH });
  strip[TAPE_WINNER_INDEX] = winnerId;

  for (let i = 0; i < TAPE_WINNER_INDEX; i++) {
    const forbidId = i > 0 ? strip[i - 1] : undefined;
    strip[i] = drawSegment(forbidId, random);
  }

  for (let i = TAPE_WINNER_INDEX + 1; i < TAPE_STRIP_LENGTH; i++) {
    const forbidId = i > TAPE_WINNER_INDEX + 1 ? strip[i - 1] : undefined;
    strip[i] = drawSegment(forbidId, random);
  }

  return strip.map((id) => {
    const segment = SEGMENT_CATALOG[id];
    if (segment === undefined) throw new Error(`unknown segment id: ${id}`);
    return segment;
  });
};
