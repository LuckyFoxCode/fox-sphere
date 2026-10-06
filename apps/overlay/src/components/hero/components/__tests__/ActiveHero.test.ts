import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import ActiveHero from '../ActiveHero.vue';
import type { ActiveHero as ActiveHeroModel } from '@/composables';

const { spawnHero, attachHeroLabel, removeHero } = vi.hoisted(() => ({
  spawnHero: vi.fn(() => 1),
  attachHeroLabel: vi.fn(),
  removeHero: vi.fn(),
}));

vi.mock('@/phaser/hero-lane', () => ({
  spawnHero,
  attachHeroLabel,
  removeHero,
}));

/** `ActiveHero.timeoutId` is a real timer handle; a fired no-op keeps the test from leaking it. */
const EXPIRED_HANDLE = setTimeout(() => {}, 0);

const hero = (heroId: string): ActiveHeroModel => ({
  userId: 'u1',
  username: 'viewer',
  heroId,
  timeoutId: EXPIRED_HANDLE,
  userLvl: 3,
  userDisplayName: 'Viewer',
  userColor: '#ffffff',
});

const Harness = defineComponent({
  props: { heroId: { type: String, required: true } },
  setup(props) {
    return () => h(ActiveHero, { activeHero: hero(props.heroId) });
  },
});

describe('ActiveHero sprite binding', () => {
  it('re-spawns the Phaser sprite when the hero changes, not just the label', async () => {
    spawnHero.mockClear();

    const wrapper = mount(Harness, { props: { heroId: 'assassin' } });
    await nextTick();

    expect(spawnHero).toHaveBeenCalledTimes(1);
    expect(spawnHero).toHaveBeenLastCalledWith('u1', 'assassin');

    await wrapper.setProps({ heroId: 'thug' });
    await nextTick();

    expect(spawnHero).toHaveBeenCalledTimes(2);
    expect(spawnHero).toHaveBeenLastCalledWith('u1', 'thug');
  });

  it('does not re-spawn when nothing about the hero changed', async () => {
    spawnHero.mockClear();

    const wrapper = mount(Harness, { props: { heroId: 'assassin' } });
    await nextTick();

    await wrapper.setProps({ heroId: 'assassin' });
    await nextTick();

    expect(spawnHero).toHaveBeenCalledTimes(1);
  });
});
