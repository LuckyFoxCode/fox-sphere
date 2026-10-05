import { DEFAULT_HERO_ID, getHeroById, HEROES } from '@fox-sphere/types';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHeroPortraitStyle } from '../heroes';

const OVERLAY_ROOT = resolve(import.meta.dirname, '../../../../');

const assetPath = (relative: string): string => `${OVERLAY_ROOT}/public/${relative}`;

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

  it('has a grid that holds every frame it claims', () => {
    for (const hero of HEROES) {
      for (const sheet of [hero.idle, hero.walk]) {
        expect(sheet.columns * sheet.rows).toBeGreaterThanOrEqual(sheet.frames);
      }
    }
  });

  it('points at sprite sheets that exist on disk', () => {
    for (const hero of HEROES) {
      expect(existsSync(assetPath(hero.idle.path)), `missing ${hero.idle.path}`).toBe(true);
      expect(existsSync(assetPath(hero.walk.path)), `missing ${hero.walk.path}`).toBe(true);
    }
  });

  it('uses its own id as the file name of both sheets', () => {
    for (const hero of HEROES) {
      expect(hero.idle.path).toBe(`assets/heroes/${hero.id}/idle.png`);
      expect(hero.walk.path).toBe(`assets/heroes/${hero.id}/walking.png`);
    }
  });

  it('crops the portrait to a single frame with CSS only', () => {
    const style = buildHeroPortraitStyle(DEFAULT_HERO_ID);

    expect(style.backgroundPosition).toBe('0 0');
    expect(style.imageRendering).toBe('pixelated');
    expect(style.backgroundImage).toMatch(/^url\('\/assets\/heroes\/.+\/idle\.png'\)$/);
  });

  it('crops the portrait of an unknown hero without throwing', () => {
    expect(() => buildHeroPortraitStyle('no-such-hero')).not.toThrow();
  });
});
