import { DEFAULT_HERO_ID, getHeroById, type HeroDefinition } from '@fox-sphere/types';

export { DEFAULT_HERO_ID, getHeroById };
export type { HeroDefinition };

/**
 * Crops the top-left frame out of a sprite sheet using background-size, so a
 * widget card can show a portrait without shipping a separate still image.
 */
export const buildHeroPortraitStyle = (heroId: string): Record<string, string> => {
  const hero = getHeroById(heroId);

  return {
    backgroundImage: `url('/${hero.idle.path}')`,
    backgroundSize: `${hero.idle.columns * 100}% ${hero.idle.rows * 100}%`,
    backgroundPosition: '0 0',
    imageRendering: 'pixelated',
  };
};
