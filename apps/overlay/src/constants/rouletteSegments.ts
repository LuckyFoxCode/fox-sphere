import type { RoulettePrizeType } from '@fox-sphere/types';

export type RouletteSegmentId =
  | 'empty'
  | 'coins60'
  | 'coins75'
  | 'coins100'
  | 'coins250'
  | 'coins500'
  | 'coins1000'
  | 'xp35'
  | 'xp100'
  | 'jackpot';

export interface RouletteWheelSegment {
  readonly id: RouletteSegmentId;
  /** Emoji-иконка категории — рендерится на карточке ленты. */
  readonly icon: string;
  /** Текстовая подпись (сумма приза) под иконкой. */
  readonly label?: string;
}

// Каталог призов — по одной записи на segment id. Не шансы: веса живут в tapeStrip.ts.
export const SEGMENT_CATALOG: Record<RouletteSegmentId, RouletteWheelSegment> = {
  empty: { id: 'empty', icon: '🎲' },
  coins60: { id: 'coins60', icon: '🪙', label: '60' },
  coins75: { id: 'coins75', icon: '🪙', label: '75' },
  coins100: { id: 'coins100', icon: '🪙', label: '100' },
  coins250: { id: 'coins250', icon: '🪙', label: '250' },
  coins500: { id: 'coins500', icon: '🪙', label: '500' },
  coins1000: { id: 'coins1000', icon: '🪙', label: '1000' },
  xp35: { id: 'xp35', icon: '⚡', label: 'XP' },
  xp100: { id: 'xp100', icon: '⚡', label: '100' },
  jackpot: { id: 'jackpot', icon: '👑' },
};

// Сумма монет -> id сегмента. Явная карта вместо `coins${amount}`: каст тащил в каталог
// любую сумму, включая те, для которой сегмента нет.
const COIN_SEGMENT_BY_AMOUNT: Record<number, RouletteSegmentId> = {
  60: 'coins60',
  75: 'coins75',
  100: 'coins100',
  250: 'coins250',
  500: 'coins500',
  1000: 'coins1000',
};

const XP_SEGMENT_BY_AMOUNT: Record<number, RouletteSegmentId> = {
  35: 'xp35',
  100: 'xp100',
};

// Приз из payload рулетки -> id сегмента ленты.
// Порядок веток значим: jackpot проверяется первым, потому что его coinAmount — это весь
// банк (~11 000), а не сегментная сумма, и в карте монет такого числа нет.
export const prizeToSegmentId = (result: {
  prizeType: RoulettePrizeType;
  coinAmount: number;
  xpAmount: number;
}): RouletteSegmentId => {
  if (result.prizeType === 'jackpot') return 'jackpot';
  if (result.prizeType === 'coins') return COIN_SEGMENT_BY_AMOUNT[result.coinAmount] ?? 'empty';
  if (result.prizeType === 'xp') return XP_SEGMENT_BY_AMOUNT[result.xpAmount] ?? 'empty';

  return 'empty';
};
