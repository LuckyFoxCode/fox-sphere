import { WIDGET_VARIANTS } from '@fox-sphere/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { paperFor, WIDGET_PAPER } from '../paperSurfaces';

const css = readFileSync(resolve(import.meta.dirname, '../../assets/styles/main.css'), 'utf8');

describe('WIDGET_PAPER', () => {
  it('has a paper for every colour the timer command accepts', () => {
    for (const variant of WIDGET_VARIANTS) {
      expect(WIDGET_PAPER[variant]).toMatch(/^bg-paper-[a-z]+$/);
    }
  });

  it('gives every colour its own paper', () => {
    const classes = WIDGET_VARIANTS.map((variant) => WIDGET_PAPER[variant]);
    expect(new Set(classes).size).toBe(WIDGET_VARIANTS.length);
  });

  /**
   * Класс, которого нет в теме, не падает - тайл просто остаётся прозрачным,
   * то есть цифры печатаются прямо по графиту. Это тихая поломка, поэтому
   * каждая бумага обязана иметь токен в main.css.
   */
  it('maps to a token that exists in the theme', () => {
    for (const variant of WIDGET_VARIANTS) {
      const name = WIDGET_PAPER[variant].replace('bg-paper-', '');
      expect(css).toContain(`--color-paper-${name}:`);
    }
  });
});

describe('paperFor', () => {
  it('returns the paper of the chosen colour', () => {
    expect(paperFor('red')).toBe('bg-paper-red');
    expect(paperFor('rose')).toBe('bg-paper-rose');
  });

  it('falls back to blue rather than leaving the tile blank', () => {
    expect(paperFor('nope' as never)).toBe('bg-paper-blue');
  });
});
