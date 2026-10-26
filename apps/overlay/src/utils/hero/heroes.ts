import { DEFAULT_HERO_ID, getHeroById, HEROES, type HeroDefinition } from '@fox-sphere/types';

export { DEFAULT_HERO_ID, getHeroById, HEROES };
export type { HeroDefinition };

/**
 * Crops the top-left frame out of the sheet a hero uses for small cards: its front-facing
 * `portrait` when the catalog has one, its `idle` sheet otherwise.
 *
 * Takes the definition rather than an id so the fallback branch stays reachable - every hero
 * in the catalog may carry a portrait, which is not the same as every future hero doing so.
 */
export const buildPortraitStyle = (hero: HeroDefinition): Record<string, string> => {
  const sheet = hero.portrait ?? hero.idle;

  return {
    backgroundImage: `url('/${sheet.path}')`,
    backgroundSize: `${sheet.columns * 100}% ${sheet.rows * 100}%`,
    backgroundPosition: '0 0',
    imageRendering: 'pixelated',
  };
};

/**
 * Background style for a small hero image in a widget card.
 *
 * Both the `!profile` circle and the level-up card use it, so a portrait change reaches them
 * through this one function.
 */
export const buildHeroPortraitStyle = (heroId: string): Record<string, string> =>
  buildPortraitStyle(getHeroById(heroId));
