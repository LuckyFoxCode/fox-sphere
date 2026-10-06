export interface HeroLaneHost {
  addHero: (userId: string, heroId: string) => void;
  attachLabel: (userId: string, label: HTMLElement) => void;
  removeHero: (userId: string) => void;
}

const requested = new Map<string, string>();
const labels = new Map<string, HTMLElement>();
const added = new Set<string>();
const generations = new Map<string, number>();

let host: HeroLaneHost | null = null;
let nextGeneration = 0;

/**
 * Replays every buffered request against the current host. Phaser's `create` runs after
 * `preload` finishes loading the sheets, so a chat message can easily arrive before a
 * scene exists; buffering makes both call orders equivalent.
 */
const flush = (): void => {
  if (!host) return;

  for (const [userId, heroId] of requested) {
    if (!added.has(userId)) {
      host.addHero(userId, heroId);
      added.add(userId);
    }

    const label = labels.get(userId);

    if (label) {
      host.attachLabel(userId, label);
    }
  }
};

export const setHeroLaneHost = (next: HeroLaneHost | null): void => {
  host = next;
  added.clear();
  flush();
};

/**
 * Claims the lane for one hero and returns the generation that proves ownership.
 *
 * A viewer who goes quiet for the TTL starts leaving, and can chat again inside that
 * leave transition - which mounts a second label component for the same user before the
 * first one unmounts. Without a generation the outgoing unmount would destroy the sprite
 * the incoming one just adopted, leaving a nickname card with nothing under it.
 */
export const spawnHero = (userId: string, heroId: string): number => {
  nextGeneration += 1;
  generations.set(userId, nextGeneration);
  requested.set(userId, heroId);
  flush();

  return nextGeneration;
};

export const attachHeroLabel = (userId: string, label: HTMLElement): void => {
  labels.set(userId, label);

  if (host && requested.has(userId)) {
    host.attachLabel(userId, label);
  }
};

/**
 * Releases the hero. A `generation` that is no longer current is ignored, so a component
 * that has already been superseded cannot take the lane down with it.
 */
export const removeHero = (userId: string, generation?: number): void => {
  if (generation !== undefined && generations.get(userId) !== generation) {
    return;
  }

  generations.delete(userId);
  requested.delete(userId);
  labels.delete(userId);
  added.delete(userId);
  host?.removeHero(userId);
};
