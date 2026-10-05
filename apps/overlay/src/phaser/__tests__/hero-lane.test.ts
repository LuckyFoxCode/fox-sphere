import { describe, expect, it, vi } from 'vitest';
import type { HeroLaneHost } from '../hero-lane';
import { attachHeroLabel, removeHero, setHeroLaneHost, spawnHero } from '../hero-lane';

const makeHost = () => {
  const addHero = vi.fn<(userId: string, heroId: string) => void>();
  const attachLabel = vi.fn<(userId: string, label: HTMLElement) => void>();
  const removeHero = vi.fn<(userId: string) => void>();

  return { addHero, attachLabel, removeHero } satisfies HeroLaneHost;
};

const cleanup = (userIds: string[]): void => {
  for (const userId of userIds) {
    removeHero(userId);
  }
  setHeroLaneHost(null);
};

describe('hero-lane bridge', () => {
  it('drops a spawn into the void when no scene exists yet, and replays it once one does', () => {
    setHeroLaneHost(null);

    expect(() => spawnHero('early', 'assassin')).not.toThrow();

    const host = makeHost();
    setHeroLaneHost(host);

    expect(host.addHero).toHaveBeenCalledExactlyOnceWith('early', 'assassin');

    cleanup(['early']);
  });

  it('replays the buffered spawn together with a label attached before the scene existed', () => {
    setHeroLaneHost(null);

    spawnHero('both', 'assassin');

    const label = document.createElement('div');
    attachHeroLabel('both', label);

    const host = makeHost();
    setHeroLaneHost(host);

    expect(host.addHero).toHaveBeenCalledExactlyOnceWith('both', 'assassin');
    expect(host.attachLabel).toHaveBeenCalledExactlyOnceWith('both', label);

    cleanup(['both']);
  });

  it('attaches a label that arrives after the hero, which is the live-spawn order', () => {
    const host = makeHost();
    setHeroLaneHost(host);

    spawnHero('live', 'assassin');

    expect(host.attachLabel).not.toHaveBeenCalled();

    const label = document.createElement('div');
    attachHeroLabel('live', label);

    expect(host.attachLabel).toHaveBeenCalledExactlyOnceWith('live', label);

    cleanup(['live']);
  });

  it('re-plays buffered spawns on the next scene, because a restart clears the added set', () => {
    setHeroLaneHost(null);

    spawnHero('restart', 'assassin');

    const first = makeHost();
    setHeroLaneHost(first);

    expect(first.addHero).toHaveBeenCalledTimes(1);

    const second = makeHost();
    setHeroLaneHost(second);

    expect(second.addHero).toHaveBeenCalledExactlyOnceWith('restart', 'assassin');

    cleanup(['restart']);
  });

  it('drops a hero from the scene, the buffer and the label set on removal', () => {
    const host = makeHost();
    setHeroLaneHost(host);

    spawnHero('leaver', 'assassin');
    attachHeroLabel('leaver', document.createElement('div'));
    removeHero('leaver');

    expect(host.removeHero).toHaveBeenCalledExactlyOnceWith('leaver');

    // A later scene must not resurrect the hero the label component unmounted.
    setHeroLaneHost(null);
    const next = makeHost();
    setHeroLaneHost(next);

    expect(next.addHero).not.toHaveBeenCalled();

    cleanup([]);
  });

  it('ignores a second spawn for the same user instead of adding a second sprite', () => {
    const host = makeHost();
    setHeroLaneHost(host);

    spawnHero('swapped', 'assassin');
    spawnHero('swapped', 'assassin');

    expect(host.addHero).toHaveBeenCalledTimes(1);

    cleanup(['swapped']);
  });

  it('survives a stale removal: the leaving label must not destroy the hero its successor adopted', () => {
    const host = makeHost();
    setHeroLaneHost(host);

    // A hero goes quiet for the TTL, so its component starts leaving, and the same viewer
    // chats again inside the leave transition. The successor mounts, adopts the sprite, and
    // the outgoing component then unmounts - which must not take the live sprite with it.
    const outgoing = spawnHero('returner', 'assassin');
    attachHeroLabel('returner', document.createElement('div'));

    const incoming = spawnHero('returner', 'assassin');

    expect(incoming).not.toBe(outgoing);
    expect(host.addHero).toHaveBeenCalledTimes(1);

    attachHeroLabel('returner', document.createElement('div'));

    host.removeHero.mockClear();

    removeHero('returner', outgoing);

    expect(host.removeHero).not.toHaveBeenCalled();

    // The live component still owns the hero, so its own unmount still works.
    removeHero('returner', incoming);

    expect(host.removeHero).toHaveBeenCalledExactlyOnceWith('returner');
  });
});
