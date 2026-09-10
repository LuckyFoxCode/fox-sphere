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
  /** Emoji-иконка категории — рендерится у обода. */
  readonly icon: string;
  /** Опциональная текстовая подпись под иконкой, вдоль радиуса. */
  readonly label?: string;
}

// Визуальная раскладка колеса — не шансы (веса живут в backend-shared).
// Каждая категория приза встречается минимум один раз, пустые чаще — как в шансах.
export const ROULETTE_WHEEL_SEGMENTS: readonly RouletteWheelSegment[] = [
  { id: 'coins30', icon: '🪙', label: '30' },
  { id: 'empty', icon: '🎲' },
  { id: 'coins60', icon: '🪙', label: '60' },
  { id: 'xp35', icon: '⚡', label: 'XP' },
  { id: 'empty', icon: '🎲' },
  { id: 'coins100', icon: '🪙', label: '100' },
  { id: 'empty', icon: '🎲' },
  { id: 'coins250', icon: '🪙', label: '250' },
  { id: 'xp35', icon: '⚡', label: 'XP' },
  { id: 'empty', icon: '🎲' },
  { id: 'coins30', icon: '🪙', label: '30' },
  { id: 'jackpot', icon: '👑' },
];

// Цвета секторов — тёмный казино-стиль поверх токенов темы.
// Джекпот — красный: золотая корона читается на нём контрастно.
export const ROULETTE_WHEEL_COLORS: Record<RouletteWheelSegment['id'], string> = {
  empty: 'var(--color-event-amber)',
  coins30: 'var(--color-event-purple)',
  coins60: 'color-mix(in oklab, var(--color-event-purple) 70%, black)',
  coins100: 'color-mix(in oklab, var(--color-event-purple) 45%, black)',
  coins250: 'var(--color-event-rose)',
  xp35: 'var(--color-event-blue)',
  jackpot: 'var(--color-event-red)',
};

// Приз из payload рулетки -> id сектора на колесе.
export const prizeToSegmentId = (result: {
  prizeType: 'empty' | 'coins' | 'xp' | 'jackpot';
  coinAmount: number;
  xpAmount: number;
}): RouletteWheelSegment['id'] => {
  if (result.prizeType === 'coins')
    return `coins${result.coinAmount}` as RouletteWheelSegment['id'];
  if (result.prizeType === 'xp') return 'xp35';
  if (result.prizeType === 'jackpot') return 'jackpot';
  return 'empty';
};
