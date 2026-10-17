import type { RouletteSegmentId } from './rouletteSegments';

export type RouletteRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface RarityStyle {
  /** Основной цвет тира — рамка карточки, акцент при выигрыше. */
  readonly color: string;
  /** Цвет подложки glow при выигрыше. */
  readonly glow: string;
  /** Радиус размытия glow, px — растёт с редкостью. */
  readonly glowSize: number;
}

// Тир кодирует ЦЕННОСТЬ ПРИЗА, а не вероятность выпадения. На колесе рулетки цвет отвечает на
// вопрос «хорошо ли я выиграл»; вероятностное кодирование сделало бы всю ленту серо-голубой.
// Поэтому `coins100` помечен `rare`, хотя это самый частый исход (35.5%) — так задумано.
// XP-тир всегда на ступень ниже монетного: «получил XP вместо монет» читается как «получил
// что-то чуть хуже», а не как случайная другая награда.
export const SEGMENT_RARITY: Record<RouletteSegmentId, RouletteRarity> = {
  empty: 'common',
  coins60: 'uncommon',
  coins75: 'uncommon',
  xp35: 'uncommon',
  coins100: 'rare',
  xp100: 'rare',
  coins250: 'epic',
  coins500: 'legendary',
  coins1000: 'mythic',
  jackpot: 'mythic',
};

export const RARITY_STYLES: Record<RouletteRarity, RarityStyle> = {
  common: {
    color: 'var(--color-text-second)',
    glow: 'transparent',
    glowSize: 0,
  },
  uncommon: {
    color: 'var(--color-event-cyan)',
    glow: 'color-mix(in oklab, var(--color-event-cyan) 45%, transparent)',
    glowSize: 12,
  },
  rare: {
    color: 'var(--color-event-blue)',
    glow: 'color-mix(in oklab, var(--color-event-blue) 45%, transparent)',
    glowSize: 16,
  },
  epic: {
    color: 'var(--color-event-purple)',
    glow: 'color-mix(in oklab, var(--color-event-purple) 50%, transparent)',
    glowSize: 20,
  },
  legendary: {
    color: 'var(--color-event-amber)',
    glow: 'color-mix(in oklab, var(--color-event-amber) 60%, transparent)',
    glowSize: 26,
  },
  mythic: {
    color: 'var(--color-event-rose)',
    glow: 'color-mix(in oklab, var(--color-event-rose) 60%, transparent)',
    glowSize: 30,
  },
};
