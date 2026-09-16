export type RouletteSegmentId =
  | 'empty'
  | 'coins30'
  | 'coins60'
  | 'coins100'
  | 'coins250'
  | 'xp35'
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
  coins30: { id: 'coins30', icon: '🪙', label: '30' },
  coins60: { id: 'coins60', icon: '🪙', label: '60' },
  coins100: { id: 'coins100', icon: '🪙', label: '100' },
  coins250: { id: 'coins250', icon: '🪙', label: '250' },
  xp35: { id: 'xp35', icon: '⚡', label: 'XP' },
  jackpot: { id: 'jackpot', icon: '👑' },
};

// Приз из payload рулетки -> id сегмента ленты.
export const prizeToSegmentId = (result: {
  prizeType: 'empty' | 'coins' | 'xp' | 'jackpot';
  coinAmount: number;
  xpAmount: number;
}): RouletteSegmentId => {
  if (result.prizeType === 'coins') return `coins${result.coinAmount}` as RouletteSegmentId;
  if (result.prizeType === 'xp') return 'xp35';
  if (result.prizeType === 'jackpot') return 'jackpot';
  return 'empty';
};
