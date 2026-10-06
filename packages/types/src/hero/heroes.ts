import catalog from "./heroes.json";

export interface HeroSpriteSheet {
  path: string;
  frames: number;
  frameRate: number;
  columns: number;
  rows: number;
}

export interface HeroSpriteGeometry {
  frameWidth: number;
  frameHeight: number;
  scale: number;
}

/**
 * The four stats every hero carries.
 *
 * A class is a different set of *values*, never a different set of keys: a melee hero and
 * an archer both fill all four. Branching on a `class` field to decide which stats exist
 * pushes that branch into every reader — the overlay card, the shop, combat — which is the
 * expensive part, and buys nothing here.
 *
 * `speed` is the only one with a live consumer today (the Phaser walk duration), so it is
 * the one worth carrying before combat exists. `range`, `mana` and friends are deliberately
 * absent: nothing reads them yet.
 */
export interface HeroStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface HeroDefinition extends HeroSpriteGeometry {
  id: string;
  name: string;
  price: number;
  maxLevel: number;
  baseStats: HeroStats;
  growth: Omit<HeroStats, "speed">;
  idle: HeroSpriteSheet;
  walk: HeroSpriteSheet;
}

interface HeroCatalog {
  sprites: HeroSpriteGeometry;
  heroes: Omit<HeroDefinition, keyof HeroSpriteGeometry>[];
}

/**
 * The catalog is authored as JSON, which TypeScript cannot narrow, so the shared geometry
 * block is merged back in here. `apps/overlay/src/utils/hero/__tests__/heroes.test.ts`
 * is what keeps this cast honest — it validates every entry's shape at CI time.
 */
const loaded = catalog as HeroCatalog;

export const HEROES: readonly HeroDefinition[] = loaded.heroes.map((hero) => ({
  ...hero,
  ...loaded.sprites,
}));

/** Grounded in the JSON so the literal union TypeScript used to derive is not silently lost. */
export const DEFAULT_HERO_ID = HEROES[0]?.id ?? "";

const heroesById = new Map<string, HeroDefinition>(
  HEROES.map((hero) => [hero.id, hero]),
);

/** The free hero every new viewer is granted before the shop exists. */
export const getDefaultHero = (): HeroDefinition => {
  const hero = heroesById.get(DEFAULT_HERO_ID);

  if (!hero) {
    throw new Error(`Default hero "${DEFAULT_HERO_ID}" is missing from the catalog`);
  }

  return hero;
};

export const isFreeHero = (id: string): boolean =>
  (heroesById.get(id) ?? getDefaultHero()).price === 0;

/**
 * Resolves a hero by id, falling back to the default so a database row naming a
 * hero that has since been renamed or removed still renders something.
 */
export const getHeroById = (id: string): HeroDefinition =>
  heroesById.get(id) ?? getDefaultHero();

/** Fractional growth rates make `base + growth * steps` accumulate float noise. */
const round2 = (value: number): number => Number(value.toFixed(2));

/**
 * Level 1 is the base stats as authored; every level after that adds one `growth` step.
 * `speed` does not grow — a hero that outran its own stat curve would need the whole walk
 * model re-tuned per level, and a flat speed is what the overlay already assumes.
 */
export const getHeroStats = (id: string, level: number = 1): HeroStats => {
  const hero = getHeroById(id);
  const steps = Math.max(0, Math.floor(level) - 1);

  return {
    health: round2(hero.baseStats.health + hero.growth.health * steps),
    attack: round2(hero.baseStats.attack + hero.growth.attack * steps),
    defense: round2(hero.baseStats.defense + hero.growth.defense * steps),
    speed: hero.baseStats.speed,
  };
};