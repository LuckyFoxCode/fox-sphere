import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { MESSAGE_TTL, useHeroOverlay } from '../useHeroOverlay';

const payload = (text: string, userId: string): TwitchChatMessagePayload => ({
  id: '1',
  userId,
  username: 'viewer',
  displayName: 'Viewer',
  color: '#ffffff',
  text,
  badges: [],
  emotes: {},
  timestamp: 0,
  hero: { heroId: 'assassin' },
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

const Harness = defineComponent({
  setup() {
    const { activeHeroes } = useHeroOverlay();

    return () =>
      h(
        'ul',
        {},
        [...activeHeroes.value.values()].map((hero) =>
          h('li', { 'data-user': hero.userId, 'data-bubble': hero.message ?? 'none' }),
        ),
      );
  },
});

const bubbleOf = (userId: string) => `[data-user="${userId}"]`;

describe('useHeroOverlay', () => {
  const { handleHeroMessage, removeHeroFromLane } = useHeroOverlay();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const userId of ['user-ttl', 'user-second']) {
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
});