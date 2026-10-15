import type { ChannelUser } from '@/api/generated/schemas';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toValue } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../../router';

type MockResponse = { status: number; data?: unknown };

const query = vi.hoisted(() => ({
  detail: { data: undefined as MockResponse | undefined, isPending: false, isError: false },
  logins: [] as unknown[],
  twitchIds: [] as unknown[],
}));

vi.mock('@/api/generated/channel-users/channel-users', async () => {
  const { ref } = await import('vue');

  // Both route params, resolved: the assertion is that the address reached the hook, which is the
  // whole point of this screen existing.
  const state = (source: { data: MockResponse | undefined; isPending: boolean; isError: boolean }) => ({
    data: ref(source.data),
    isPending: ref(source.isPending),
    isError: ref(source.isError),
  });

  return {
    useGetChannelUser: (login: unknown, twitchId: unknown) => {
      query.logins.push(toValue(login));
      query.twitchIds.push(toValue(twitchId));

      return state(query.detail);
    },
    // Imported by the other views the router pulls in; an import of a name the factory does not
    // provide throws at module load.
    useListChannelUsers: () => state({ data: undefined, isPending: false, isError: false }),
    useGetChannelLeaderboard: () =>
      state({ data: { status: 200, data: { topCoins: [], topXp: [] } }, isPending: false, isError: false }),
  };
});

const ChannelUserDetailView = (await import('../ChannelUserDetailView.vue')).default;

const viewer = (overrides: Partial<ChannelUser> = {}): ChannelUser => ({
  twitchId: '191983746',
  username: 'luckyfoxcode',
  coins: 4200,
  lvl: 7,
  xp: 910,
  lastXpAt: '2026-10-07T10:00:00.000Z',
  isMod: false,
  isFounder: false,
  isSubscriber: false,
  isPermanentVip: true,
  spinsCount: 12,
  totalWin: 300,
  totalLoss: 100,
  xpThisWeek: 40,
  hasTicket: true,
  isLuckyVip: false,
  ...overrides,
});

const mountView = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/channels/luckyfoxcode/viewers/191983746');
  await router.isReady();

  return mount(ChannelUserDetailView, { global: { plugins: [router] } });
};

beforeEach(() => {
  query.detail = { data: undefined, isPending: false, isError: false };
  query.logins = [];
  query.twitchIds = [];
});

describe('ChannelUserDetailView', () => {
  // The route is the feature: both params have to reach the endpoint or the screen shows someone
  // else's viewer, or a 404 with no way to tell why.
  it('asks for the channel and the viewer named in the address', async () => {
    await mountView();

    expect(query.logins[0]).toBe('luckyfoxcode');
    expect(query.twitchIds[0]).toBe('191983746');
  });

  it('shows the trail back through the table to the channel', async () => {
    const wrapper = await mountView();
    const crumbs = wrapper.findAll('nav[aria-label="Breadcrumb"] li');

    expect(crumbs.map((crumb) => crumb.text().trim())).toEqual([
      'Channels',
      'luckyfoxcode',
      'Viewers',
      '191983746',
    ]);
  });

  // Until the response lands there is no name to show, and the id is what was asked for. A blank
  // trail would leave the reader with no idea what they were looking at.
  it('falls back to the twitch id while the viewer is unknown', async () => {
    query.detail.isPending = true;

    const wrapper = await mountView();

    expect(wrapper.text()).toContain('191983746');
    expect(wrapper.text()).toContain('Loading');
  });

  it('shows a loading state while the viewer is pending', async () => {
    query.detail.isPending = true;

    expect((await mountView()).text()).toContain('Loading');
  });

  it('reports a transport failure separately from a bad response', async () => {
    query.detail.isError = true;

    expect((await mountView()).text()).toContain('Could not reach the api');
  });

  it('says so on 404 rather than showing an empty panel', async () => {
    query.detail.data = { status: 404 };

    expect((await mountView()).text()).toContain('Channel user not found');
  });

  it('surfaces undocumented statuses through the failure branch', async () => {
    query.detail.data = { status: 502 };

    expect((await mountView()).text()).toContain('Request failed (HTTP 502)');
  });

  it('renders every balance the bot keeps for that viewer', async () => {
    query.detail.data = { status: 200, data: viewer() };

    const text = (await mountView()).text();

    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('4200');
    expect(text).toContain('910');
    expect(text).toContain('XP this week');
    expect(text).toContain('Wins');
    expect(text).toContain('Losses');
  });

  // The name replaces the id in the heading and the crumb once it is known, so the page says who
  // it is about rather than what to look it up by.
  it('uses the username once it arrives', async () => {
    query.detail.data = { status: 200, data: viewer() };

    const wrapper = await mountView();
    const crumbs = wrapper.findAll('nav[aria-label="Breadcrumb"] li');

    expect(crumbs[crumbs.length - 1]?.text().trim()).toBe('luckyfoxcode');
    expect(wrapper.find('h1').text()).toBe('luckyfoxcode');
  });

  it('shows a dash instead of Invalid Date for an unparsable timestamp', async () => {
    query.detail.data = { status: 200, data: viewer({ lastXpAt: 'not-a-date' }) };

    expect((await mountView()).text()).toContain('—');
  });
});