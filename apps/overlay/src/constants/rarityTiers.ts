import type { RouletteSegmentId } from './rouletteSegments';

export type RouletteRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityStyle {
  /** Основной цвет тира — рамка карточки, акцент при выигрыше. */
  readonly color: string;
  /** Цвет подложки glow при выигрыше. */
  readonly glow: string;
  /** Радиус размытия glow, px — растёт с редкостью. */
  readonly glowSize: number;
}

// 5 тиров CS:GO-стиля: цвет карточки теперь от редкости, а не от сегмента.
export const SEGMENT_RARITY: Record<RouletteSegmentId, RouletteRarity> = {
  empty: 'common',
  coins30: 'common',
  coins60: 'uncommon',
  xp35: 'uncommon',
  coins100: 'rare',
  coins250: 'epic',
  jackpot: 'legendary',
};

export const RARITY_STYLES: Record<RouletteRarity, RarityStyle> = {
  common: {
    color: 'var(--color-text-second)',
    glow: 'transparent',
    glowSize: 0,
  },
  uncommon: {
    color: 'var(--color-lime)',
    glow: 'color-mix(in oklab, var(--color-lime) 45%, transparent)',
    glowSize: 10,
  },
  rare: {
    color: 'var(--color-event-blue)',
    glow: 'color-mix(in oklab, var(--color-event-blue) 45%, transparent)',
    glowSize: 14,
  },
  epic: {
    color: 'var(--color-event-purple)',
    glow: 'color-mix(in oklab, var(--color-event-purple) 50%, transparent)',
    glowSize: 18,
  },
  legendary: {
    color: 'var(--color-event-amber)',
    glow: 'color-mix(in oklab, var(--color-event-amber) 60%, transparent)',
    glowSize: 22,
  },
};
