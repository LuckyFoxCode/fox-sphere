import { mount } from '@vue/test-utils';
import type { ProfileShowPayload } from '@fox-sphere/types';
import { describe, expect, it } from 'vitest';
import ProfileCard from '../ProfileCard.vue';

const buildProfile = (overrides: Partial<ProfileShowPayload> = {}): ProfileShowPayload => ({
  username: 'novapaws',
  displayName: 'NovaPaws',
  color: '#1d4ed8',
  userId: '42',
  lvl: 12,
  xp: 4320,
  startXp: 1000,
  maxXp: 5600,
  coins: 12480,
  heroId: 'assassin',
  heroLevel: 7,
  bestStreak: 30,
  goldenBeers: 3,
  isMod: false,
  isFounder: false,
  isSubscriber: false,
  isPermanentVip: false,
  isLuckyVip: false,
  isBroadcaster: false,
  ...overrides,
});

const mountCard = (overrides: Partial<ProfileShowPayload> = {}) =>
  mount(ProfileCard, { props: { profile: buildProfile(overrides) } });

const statTile = (overrides: Partial<ProfileShowPayload>, key: string) =>
  mountCard(overrides).find(`[data-stat="${key}"]`);

describe('ProfileCard', () => {
  it('draws hero stats at the hero level, not the level-1 base stats', () => {
    // assassin: health 100 + 9 * 6 levels = 154; attack 12 + 1.2 * 6 = 19.2 -> 19.
    expect(statTile({ heroId: 'assassin', heroLevel: 7 }, 'health').text()).toContain('154');
    expect(statTile({ heroId: 'assassin', heroLevel: 7 }, 'attack').text()).toContain('19');
  });

  it('falls back to the base stats at level 1 before the hero has levelled', () => {
    expect(statTile({ heroId: 'assassin', heroLevel: 1 }, 'health').text()).toContain('100');
  });

  it('states the xp progress as the distance travelled through the current level', () => {
    // (4320 - 1000) / (5600 - 1000) = 72.17%
    const bar = mountCard().find('[role="progressbar"]');

    expect(bar.attributes('aria-valuenow')).toBe('72');
  });
});
