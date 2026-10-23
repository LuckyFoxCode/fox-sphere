import {
  DEFAULT_HERO_ID,
  getDefaultHero,
  getHeroById,
  getHeroStats,
  HEROES,
  isFreeHero,
  type HeroDefinition,
  type HeroSpriteSheet,
} from '@fox-sphere/types';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHeroPortraitStyle, buildPortraitStyle } from '../heroes';

const OVERLAY_ROOT = resolve(import.meta.dirname, '../../../../');

const assetPath = (relative: string): string => `${OVERLAY_ROOT}/public/${relative}`;

const NUMBERS = ['price', 'maxLevel', 'frameWidth', 'frameHeight', 'scale'] as const;
const STAT_KEYS = ['health', 'attack', 'defense', 'speed'] as const;
const GROWTH_KEYS = ['health', 'attack', 'defense'] as const;
const SHEET_KEYS = ['path', 'frames', 'frameRate', 'columns', 'rows'] as const;

/** `idle` and `walk` are required, `portrait` is not - so a missing one must not break the loops. */
const sheetsOf = (hero: HeroDefinition): HeroSpriteSheet[] => [
  hero.idle,
  hero.walk,
  ...(hero.portrait ? [hero.portrait] : []),
];

describe('hero catalog', () => {
  it('is never empty, so a viewer always gets a hero', () => {
    expect(HEROES.length).toBeGreaterThan(0);
  });

  it('falls back to the default hero for an unknown id', () => {
    expect(getHeroById('no-such-hero').id).toBe(DEFAULT_HERO_ID);
  });

  it('falls back for an empty id, which is what a dropped row used to produce', () => {
    expect(getHeroById('').id).toBe(DEFAULT_HERO_ID);
  });

  it('resolves a known id to its own definition', () => {
    expect(getHeroById(DEFAULT_HERO_ID).id).toBe(DEFAULT_HERO_ID);
  });

  /**
   * The catalog is authored as JSON, so `satisfies` can no longer check it at compile time.
   * This is what replaces that guarantee.
   */
  it('gives every hero every required number', () => {
    for (const hero of HEROES) {
      for (const key of NUMBERS) {
        expect(Number.isFinite(hero[key]), `${hero.id}.${key}`).toBe(true);
      }

      for (const key of STAT_KEYS) {
        expect(Number.isFinite(hero.baseStats[key]), `${hero.id}.baseStats.${key}`).toBe(true);
      }

      for (const key of GROWTH_KEYS) {
        expect(Number.isFinite(hero.growth[key]), `${hero.id}.growth.${key}`).toBe(true);
      }
    }
  });

  it('gives every sheet every required field', () => {
    for (const hero of HEROES) {
      for (const sheet of sheetsOf(hero)) {
        for (const key of SHEET_KEYS) {
          expect(sheet[key], `${hero.id}.${key}`).toBeDefined();
        }

        expect(sheet.frames).toBeGreaterThan(0);
        expect(sheet.frameRate).toBeGreaterThan(0);
      }
    }
  });

  it('has a grid that holds every frame it claims', () => {
    for (const hero of HEROES) {
      for (const sheet of sheetsOf(hero)) {
        expect(sheet.columns * sheet.rows).toBeGreaterThanOrEqual(sheet.frames);
      }
    }
  });

  it('points at sprite sheets that exist on disk', () => {
    for (const hero of HEROES) {
      for (const sheet of sheetsOf(hero)) {
        expect(existsSync(assetPath(sheet.path)), `missing ${sheet.path}`).toBe(true);
      }
    }
  });

  it('uses its own id as the file name of both sheets', () => {
    for (const hero of HEROES) {
      expect(hero.idle.path).toBe(`assets/heroes/${hero.id}/idle.webp`);
      expect(hero.walk.path).toBe(`assets/heroes/${hero.id}/walking.webp`);
    }
  });

  it('uses front.webp as the file name of a portrait', () => {
    for (const hero of HEROES) {
      if (!hero.portrait) continue;

      expect(hero.portrait.path).toBe(`assets/heroes/${hero.id}/front.webp`);
    }
  });

  it('has no duplicate ids, which would make lookup order-dependent', () => {
    const ids = HEROES.map((hero) => hero.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no negative prices or levels', () => {
    for (const hero of HEROES) {
      expect(hero.price).toBeGreaterThanOrEqual(0);
      expect(hero.maxLevel).toBeGreaterThan(0);
    }
  });

  it('has a positive speed, which the wander controller divides by', () => {
    for (const hero of HEROES) {
      expect(hero.baseStats.speed).toBeGreaterThan(0);
    }
  });
});

describe('free and paid heroes', () => {
  it('has at least one free hero, which is what a new viewer is granted', () => {
    expect(HEROES.filter((hero) => hero.price === 0).length).toBeGreaterThan(0);
  });

  it('grants the free default rather than a paid hero', () => {
    expect(getDefaultHero().price).toBe(0);
  });

  it('reports the default as free and a paid hero as not', () => {
    expect(isFreeHero(DEFAULT_HERO_ID)).toBe(true);

    const paid = HEROES.find((hero) => hero.price > 0);

    expect(paid).toBeDefined();
    expect(isFreeHero(paid!.id)).toBe(false);
  });

  it('treats an unknown id as the free default, the way lookup falls back', () => {
    expect(isFreeHero('no-such-hero')).toBe(true);
  });
});

describe('getHeroStats', () => {
  it('returns the authored base stats at level 1', () => {
    const hero = getDefaultHero();

    expect(getHeroStats(hero.id, 1)).toEqual(hero.baseStats);
  });

  it('defaults to level 1 when no level is given', () => {
    expect(getHeroStats(DEFAULT_HERO_ID)).toEqual(getHeroById(DEFAULT_HERO_ID).baseStats);
  });

  it('adds one growth step per level past the first', () => {
    const hero = getHeroById('robber');
    // Rounded to match: fractional growth would otherwise make the expectation carry the
    // same float noise the implementation deliberately removes.
    const expectedAttack = Number((hero.baseStats.attack + hero.growth.attack * 9).toFixed(2));

    expect(getHeroStats('robber', 2).health).toBe(hero.baseStats.health + hero.growth.health);
    expect(getHeroStats('robber', 10).attack).toBe(expectedAttack);
  });

  it('rounds fractional growth, so a shop never renders 22.799999999999997', () => {
    for (const hero of HEROES) {
      for (let level = 1; level <= hero.maxLevel; level++) {
        for (const key of GROWTH_KEYS) {
          const value = getHeroStats(hero.id, level)[key];

          expect(value).toBe(Number(value.toFixed(2)));
        }
      }
    }
  });

  it('grows a stat monotonically with level', () => {
    for (const hero of HEROES) {
      let previous = 0;

      for (let level = 1; level <= hero.maxLevel; level++) {
        const { health } = getHeroStats(hero.id, level);

        expect(health).toBeGreaterThan(previous);
        previous = health;
      }
    }
  });

  it('leaves speed flat, so a levelled hero never outruns the walk model', () => {
    for (const hero of HEROES) {
      expect(getHeroStats(hero.id, hero.maxLevel).speed).toBe(hero.baseStats.speed);
    }
  });

  it('never lets a nonsensical level shrink a hero below its base', () => {
    const hero = getHeroById('thug');

    expect(getHeroStats('thug', 0).health).toBe(hero.baseStats.health);
    expect(getHeroStats('thug', -5).attack).toBe(hero.baseStats.attack);
  });

  it('gives the roster genuinely different stats, not three copies', () => {
    const signatures = new Set(
      HEROES.map(
        (hero) =>
          `${hero.baseStats.health}/${hero.baseStats.attack}/` +
          `${hero.baseStats.defense}/${hero.baseStats.speed}`,
      ),
    );

    expect(signatures.size).toBe(HEROES.length);
  });
});

describe('buildHeroPortraitStyle', () => {
  const heroWithPortrait = HEROES.find((hero) => hero.portrait !== undefined);

  it('crops the first frame of the front-facing portrait', () => {
    if (!heroWithPortrait?.portrait) throw new Error('no hero carries a portrait in the catalog');

    const style = buildHeroPortraitStyle(heroWithPortrait.id);
    const { columns, rows } = heroWithPortrait.portrait;

    expect(style.backgroundImage).toBe(`url('/${heroWithPortrait.portrait.path}')`);
    expect(style.backgroundSize).toBe(`${columns * 100}% ${rows * 100}%`);
    expect(style.backgroundPosition).toBe('0 0');
    expect(style.imageRendering).toBe('pixelated');
  });

  it('crops a single idle frame when the hero has no portrait', () => {
    const hero = getHeroById(DEFAULT_HERO_ID);
    const style = buildPortraitStyle({ ...hero, portrait: undefined });

    expect(style.backgroundImage).toBe(`url('/${hero.idle.path}')`);
    expect(style.backgroundPosition).toBe('0 0');
    expect(style.imageRendering).toBe('pixelated');
  });

  it('crops the portrait of an unknown hero without throwing', () => {
    expect(() => buildHeroPortraitStyle('no-such-hero')).not.toThrow();
  });

  it('gives a different portrait per hero', () => {
    const images = HEROES.map((hero) => buildHeroPortraitStyle(hero.id).backgroundImage);

    expect(new Set(images).size).toBe(HEROES.length);
  });
});
