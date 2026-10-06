export interface HeroSpriteSheet {
  path: string;
  frames: number;
  frameRate: number;
  columns: number;
  rows: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  idle: HeroSpriteSheet;
  walk: HeroSpriteSheet;
}

export const HEROES = [
  {
    id: "assassin",
    name: "Assassin",
    frameWidth: 480,
    frameHeight: 480,
    scale: 0.25,
    idle: {
      path: "assets/heroes/assassin/idle.png",
      frames: 16,
      frameRate: 12,
      columns: 4,
      rows: 4,
    },
    walk: {
      path: "assets/heroes/assassin/walking.png",
      frames: 20,
      frameRate: 16,
      columns: 4,
      rows: 5,
    },
  },
  {
    id: "robber",
    name: "Robber",
    frameWidth: 480,
    frameHeight: 480,
    scale: 0.25,
    idle: {
      path: "assets/heroes/robber/idle.png",
      frames: 16,
      frameRate: 12,
      columns: 4,
      rows: 4,
    },
    walk: {
      path: "assets/heroes/robber/walking.png",
      frames: 20,
      frameRate: 16,
      columns: 4,
      rows: 5,
    },
  },
  {
    id: "thug",
    name: "Thug",
    frameWidth: 480,
    frameHeight: 480,
    scale: 0.25,
    idle: {
      path: "assets/heroes/thug/idle.png",
      frames: 16,
      frameRate: 12,
      columns: 4,
      rows: 4,
    },
    walk: {
      path: "assets/heroes/thug/walking.png",
      frames: 20,
      frameRate: 16,
      columns: 4,
      rows: 5,
    },
  },
] as const satisfies readonly [HeroDefinition, ...HeroDefinition[]];

export type HeroId = (typeof HEROES)[number]["id"];

export const DEFAULT_HERO_ID: HeroId = "assassin";

const heroesById = new Map<string, HeroDefinition>(
  HEROES.map((hero) => [hero.id, hero]),
);

/**
 * Resolves a hero by id, falling back to the default so a database row naming a
 * hero that has since been renamed or removed still renders something.
 */
export const getHeroById = (id: string): HeroDefinition => {
  const hero = heroesById.get(id) ?? heroesById.get(DEFAULT_HERO_ID);

  if (!hero) {
    throw new Error(
      `Default hero "${DEFAULT_HERO_ID}" is missing from the catalog`,
    );
  }

  return hero;
};
