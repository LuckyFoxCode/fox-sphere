import type { ChannelUser } from '@/api/generated/schemas';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toValue } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../../router';

type MockResponse = { status: number; data?: unknown };

// Mock state for the generated hooks. Note that these names are NOT checked
// against the module's exports: vitest's `vi.mock(stringPath, factory)` overload
// is untyped, so a typo in a hook name fails at runtime rather than at the
// type-check. Every hook the view calls is here, and every value is a REAL ref -
// a plain `{ value }` object reads as always-truthy in a template and every
// status branch misfires.
const query = vi.hoisted(() => ({
  list: { data: undefined as MockResponse | undefined, isPending: false, isError: false },
  listLogins: [] as unknown[],
  params: undefined as unknown,
}));

vi.mock('@/api/generated/channel-users/channel-users', async () => {
  const { ref } = await import('vue');

  // `useGetChannelLeaderboard` and `useGetChannelUser` are not called by this view any more - the
  // leaderboards moved to ChannelView and the detail to ChannelUserDetailView. They are mocked
  // anyway because the test imports the real `routes`, which pulls in those views, and an import
  // of a name the factory does not provide throws at module load.
  return {
    useListChannelUsers: (login: unknown, params: unknown) => {
      // Record the RESOLVED login, and keep the params SOURCE rather than a snapshot of it.
      // The hook is called once, so a recorded value is whatever the page was at mount time -
      // which is exactly the thing a paging test needs to assert has changed.
      query.listLogins.push(toValue(login));
      query.params = params;

      return {
        data: ref(query.list.data),
        isPending: ref(query.list.isPending),
        isError: ref(query.list.isError),
      };
    },
    useGetChannelLeaderboard: () => ({
      data: ref({ status: 200, data: { topCoins: [], topXp: [] } }),
      isPending: ref(false),
      isError: ref(false),
    }),
    useGetChannelUser: () => ({
      data: ref(undefined),
      isPending: ref(false),
      isError: ref(false),
    }),
  };
});

const ChannelUsersView = (await import('../ChannelUsersView.vue')).default;

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
  isPermanentVip: false,
  spinsCount: 12,
  totalWin: 300,
  totalLoss: 100,
  xpThisWeek: 40,
  hasTicket: false,
  isLuckyVip: false,
  ...overrides,
});

const page = (items: ChannelUser[], overrides: Partial<MockResponse> = {}) => ({
  status: 200,
  data: { items, total: items.length, page: 1, perPage: 50 },
  ...overrides,
});

const mountView = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/channels/luckyfoxcode/viewers');
  await router.isReady();

  return mount(ChannelUsersView, { global: { plugins: [router] } });
};

const button = (wrapper: Awaited<ReturnType<typeof mountView>>, text: string) =>
  wrapper.findAll('button').find((candidate) => candidate.text().trim() === text);

// What the view is asking for right now, not what it asked for when it mounted.
const currentParams = () => toValue(query.params as Parameters<typeof toValue>[0]);

beforeEach(() => {
  query.list = { data: undefined, isPending: false, isError: false };
  query.listLogins = [];
  query.params = undefined;
});

describe('ChannelUsersView', () => {
  it('passes the route login and the first page to the list hook', async () => {
    await mountView();

    expect(query.listLogins[0]).toBe('luckyfoxcode');
    expect(currentParams()).toEqual({ page: 1, perPage: 50 });
  });

  // The two levels above this screen, so the trail is the whole way back and not a skip.
  it('shows the trail back through the channel to the list', async () => {
    const wrapper = await mountView();
    const links = wrapper.findAll('nav[aria-label="Breadcrumb"] a');

    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/channels',
      '/channels/luckyfoxcode',
    ]);
  });

  it('shows a loading state while the list is pending', async () => {
    query.list.isPending = true;

    expect((await mountView()).text()).toContain('Loading');
  });

  it('reports a transport failure separately from a bad response', async () => {
    query.list.isError = true;

    expect((await mountView()).text()).toContain('Could not reach the api');
  });

  it('says so on 404 rather than showing an empty table', async () => {
    query.list.data = { status: 404 };

    expect((await mountView()).text()).toContain('Channel not found');
  });

  it('renders a row per viewer on 200', async () => {
    query.list.data = page([viewer(), viewer({ twitchId: '2', username: 'second' })]);

    const text = (await mountView()).text();

    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('second');
    expect(text).toContain('4200');
  });

  // This is the whole point of the route: a name that reads as a link and carries its own
  // address. Before, the click set a local ref and the panel rendered further down.
  it('links each viewer name to that viewer on their own route', async () => {
    query.list.data = page([viewer()]);

    const wrapper = await mountView();
    const link = wrapper.find('tbody a');

    expect(link.text()).toBe('luckyfoxcode');
    expect(link.attributes('href')).toBe('/channels/luckyfoxcode/viewers/191983746');
  });

  it('shows the empty state on 200 with no viewers', async () => {
    query.list.data = page([]);

    expect((await mountView()).text()).toContain('No viewers yet for this channel.');
  });

  it('surfaces undocumented statuses through the failure branch', async () => {
    query.list.data = { status: 502 };

    expect((await mountView()).text()).toContain('Request failed (HTTP 502)');
  });

  // 25 viewers at 10 per page is three pages, so Next and Previous both have somewhere to go.
// Every Select emit is followed by a tick: the page size feeds the page count, which feeds the
// buttons' disabled state, so clicking Next before the re-render hits a still-disabled button and
// nothing happens.
it('walks pages and stays on the first one when there is nowhere to go back to', async () => {
    query.list.data = page(
      Array.from({ length: 25 }, (_, index) => viewer({ twitchId: String(index) })),
    );

    const wrapper = await mountView();
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', '10');
    await wrapper.vm.$nextTick();

    expect(button(wrapper, 'Previous')?.attributes('disabled')).toBeDefined();
    expect(currentParams()).toEqual({ page: 1, perPage: 10 });

    await button(wrapper, 'Next')?.trigger('click');
    expect(currentParams()).toEqual({ page: 2, perPage: 10 });

    await button(wrapper, 'Previous')?.trigger('click');
    expect(currentParams()).toEqual({ page: 1, perPage: 10 });
  });

  it('returns to the first page when the page size changes', async () => {
    query.list.data = page(
      Array.from({ length: 25 }, (_, index) => viewer({ twitchId: String(index) })),
    );

    const wrapper = await mountView();
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', '10');
    await wrapper.vm.$nextTick();

    await button(wrapper, 'Next')?.trigger('click');
    expect(currentParams()).toEqual({ page: 2, perPage: 10 });

    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', '100');
    await wrapper.vm.$nextTick();

    expect(currentParams()).toEqual({ page: 1, perPage: 100 });
  });

  it('shows a dash instead of Invalid Date for an unparsable timestamp', async () => {
    query.list.data = page([viewer({ lastXpAt: 'not-a-date' })]);

    expect((await mountView()).text()).toContain('—');
  });

  // Both used to live here and now do not: the leaderboards moved to the channel overview and the
  // detail to its own route. Asserted so a future move back is a deliberate act, not an accident.
  it('no longer carries the leaderboards or the viewer panel', async () => {
    query.list.data = page([viewer()]);

    const text = (await mountView()).text();

    expect(text).not.toContain('Top coins');
    expect(text).not.toContain('Viewer detail');
  });
});