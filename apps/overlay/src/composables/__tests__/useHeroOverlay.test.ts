import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { MESSAGE_TTL, useHeroOverlay } from '../useHeroOverlay';

const payload = (
  text: string,
  userId: string,
  heroId = 'assassin',
): TwitchChatMessagePayload => ({
  id: '1',
  userId,
  username: 'viewer',
  displayName: 'Viewer',
  color: '#ffffff',
  text,
  badges: [],
  emotes: {},
  timestamp: 0,
  hero: { heroId },
  userLvl: 3,
  isMod: false,
  isFollower: false,
  isFounder: false,
  isSubscriber: false,
  isVip: false,
  isPermanentVip: false,
  isBroadcaster: false,
  isBot: false,
  isHighlight: false,
  isAction: false,
});

const bubbleOf = (userId: string) => `[data-user="${userId}"]`;

const Harness = defineComponent({
  setup() {
    const { activeHeroes } = useHeroOverlay();

    return () =>
      h(
        'ul',
        {},
        [...activeHeroes.value.values()].map((hero) =>
          h(
            'li',
            {
              'data-user': hero.userId,
              'data-bubble': hero.message ?? 'none',
              'data-hero': hero.heroId,
            },
            hero.userDisplayName ?? '',
          ),
        ),
      );
  },
});

describe('useHeroOverlay', () => {
  const { handleHeroMessage, removeHeroFromLane } = useHeroOverlay();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const userId of ['user-ttl', 'user-second', 'user-swap']) {
      removeHeroFromLane(userId);
    }

    vi.useRealTimers();
  });

  it('clears the first message bubble after MESSAGE_TTL', async () => {
    handleHeroMessage(payload('first message', 'user-ttl'));

    const wrapper = mount(Harness);
    await nextTick();

    expect(wrapper.find(bubbleOf('user-ttl')).attributes('data-bubble')).toBe('first message');

    vi.advanceTimersByTime(MESSAGE_TTL);
    await nextTick();

    expect(wrapper.find(bubbleOf('user-ttl')).attributes('data-bubble')).toBe('none');
  });

  it('replaces the bubble text on a second message', async () => {
    handleHeroMessage(payload('first message', 'user-second'));

    const wrapper = mount(Harness);
    await nextTick();

    vi.advanceTimersByTime(MESSAGE_TTL);
    handleHeroMessage(payload('second message', 'user-second'));
    await nextTick();

    expect(wrapper.find(bubbleOf('user-second')).attributes('data-bubble')).toBe(
      'second message',
    );
  });

  /**
   * A viewer already in the lane keeps their `ActiveHero` for HERO_TTL, so a hero swapped in
   * the database stays invisible until they fall out of the lane and come back.
   */
  it('picks up a heroId change on the next message while still in the lane', async () => {
    handleHeroMessage(payload('first message', 'user-swap', 'assassin'));

    const wrapper = mount(Harness);
    await nextTick();

    expect(wrapper.find(bubbleOf('user-swap')).attributes('data-hero')).toBe('assassin');

    handleHeroMessage(payload('second message', 'user-swap', 'thug'));
    await nextTick();

    expect(wrapper.find(bubbleOf('user-swap')).attributes('data-hero')).toBe('thug');
  });

  it('picks up a viewer flag change too, since the same payload carries both', async () => {
    handleHeroMessage(payload('first message', 'user-swap', 'assassin'));

    const wrapper = mount(Harness);
    await nextTick();

    handleHeroMessage({
      ...payload('second message', 'user-swap', 'assassin'),
      userLvl: 42,
      displayName: 'Renamed',
    });
    await nextTick();

    expect(wrapper.find(bubbleOf('user-swap')).text()).toBe('Renamed');
  });
});