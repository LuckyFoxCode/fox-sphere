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
  leaderboard: { data: undefined as MockResponse | undefined, isPending: false, isError: false },
  detail: { data: undefined as MockResponse | undefined, isPending: false, isError: false },
  listLogins: [] as unknown[],
  leaderboardLogins: [] as unknown[],
  detailLogins: [] as unknown[],
  params: [] as unknown[],
  detailTwitchId: undefined as unknown,
  detailOptions: undefined as unknown,
}));

vi.mock('@/api/generated/channel-users/channel-users', async () => {
  const { computed, ref, toValue } = await import('vue');

  const state = (source: {
    data: MockResponse | undefined;
    isPending: boolean;
    isError: boolean;
  }) => ({
    data: ref(source.data),
    isPending: ref(source.isPending),
    isError: ref(source.isError),
  });

  return {
    useListChannelUsers: (login: unknown, params: unknown) => {
      // Record the RESOLVED values: the view passes computeds, and the assertion
      // is that the route param and the page state reached the hook.
      query.listLogins.push(toValue(login));
      query.params.push(toValue(params));

      return state(query.list);
    },
    useGetChannelLeaderboard: (login: unknown) => {
      query.leaderboardLogins.push(toValue(login));

      return state(query.leaderboard);
    },
    useGetChannelUser: (login: unknown, twitchId: unknown, options: unknown) => {
      query.detailLogins.push(toValue(login));
      query.detailTwitchId = twitchId;
      query.detailOptions = options;

      return {
        // A real hook refetches when the twitchId changes, so the payload is
        // derived from the id it was handed: a panel can only show what was asked
        // for, never a value the fixture happened to carry.
        data: computed<MockResponse | undefined>(() => {
          const response = query.detail.data;
          const asked = toValue(query.detailTwitchId);

          if (!response || response.status !== 200 || !asked) return response;

          return { status: 200, data: { ...(response.data as ChannelUser), twitchId: asked } };
        }),
        isPending: ref(query.detail.isPending),
        isError: ref(query.detail.isError),
      };
    },
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

const nameButton = (wrapper: Awaited<ReturnType<typeof mountView>>, index: number) =>
  wrapper.findAll('tbody button')[index];

// The generated hook enables on any non-null twitchId, so `enabled` is what keeps
// the detail query dormant. Reading it here also pins the fact that the view
// supplies one at all - the mock never merges the options the real hook does.
const detailEnabled = () => {
  const options = query.detailOptions as { query?: { enabled?: unknown } };

  return toValue(options.query?.enabled);
};

beforeEach(() => {
  query.list = { data: undefined, isPending: false, isError: false };
  query.leaderboard = { data: undefined, isPending: false, isError: false };
  query.detail = { data: undefined, isPending: false, isError: false };
  query.listLogins = [];
  query.leaderboardLogins = [];
  query.detailLogins = [];
  query.params = [];
  query.detailTwitchId = undefined;
  query.detailOptions = undefined;
});

describe('ChannelUsersView', () => {
  it('passes the route login and the first page to both queries', async () => {
    await mountView();

    expect(query.listLogins).toEqual(['luckyfoxcode']);
    expect(query.leaderboardLogins).toEqual(['luckyfoxcode']);
    expect(query.params).toEqual([{ page: 1, perPage: 50 }]);
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
    query.list.data = { status: 404, data: { message: 'Channel not found' } };

    expect((await mountView()).text()).toContain('Channel not found');
  });

  it('renders a row per viewer on 200', async () => {
    query.list.data = page([
      viewer(),
      viewer({
        twitchId: '2',
        username: 'second',
        coins: 0,
        lvl: 1,
        isMod: true,
        isSubscriber: true,
        isPermanentVip: true,
        hasTicket: true,
      }),
    ]);

    const text = (await mountView()).text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('second');
    expect(text).toContain('4200');
    expect(text).toContain('7');
    expect(text).toContain('2 viewers');
    expect(text).toContain('page 1 of 1');
    // Flags are badges, so only the ones that are set render.
    expect(text).toContain('mod');
    expect(text).not.toContain('founder');
    // `lastXpAt` is an ISO string; the row shows a formatted date, not the raw value.
    expect(text).not.toContain('2026-10-07T10:00:00.000Z');
  });

  it('shows the empty state on 200 with no viewers', async () => {
    query.list.data = page([]);

    expect((await mountView()).text()).toContain('No viewers yet');
  });

  it('surfaces undocumented statuses through the failure branch', async () => {
    query.list.data = { status: 502 };

    expect((await mountView()).text()).toContain('Request failed (HTTP 502)');
  });

  it('renders both leaderboards on 200', async () => {
    query.list.data = page([viewer()]);
    query.leaderboard.data = {
      status: 200,
      data: {
        topCoins: [viewer({ username: 'richest' })],
        topXp: [viewer({ username: 'hardest' })],
      },
    };

    const text = (await mountView()).text();
    expect(text).toContain('Top coins');
    expect(text).toContain('Top xp');
    expect(text).toContain('richest');
    expect(text).toContain('hardest');
  });

  // The leaderboard is decoration next to the list; a failure there must not hide the table.
  it('keeps the viewer list when the leaderboard fails', async () => {
    query.list.data = page([viewer()]);
    query.leaderboard.data = { status: 500, data: { message: 'Internal server error' } };

    const text = (await mountView()).text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('Request failed (HTTP 500)');
    expect(text).toContain('Internal server error');
  });

  it('walks pages and stays on the first one when there is nowhere to go back to', async () => {
    query.list.data = page([viewer()], {
      data: { items: [viewer()], total: 120, page: 1, perPage: 50 },
    });

    const wrapper = await mountView();
    expect(wrapper.text()).toContain('page 1 of 3');

    await button(wrapper, 'Previous')?.trigger('click');
    expect(wrapper.text()).toContain('page 1 of 3');

    await button(wrapper, 'Next')?.trigger('click');
    expect(wrapper.text()).toContain('page 2 of 3');

    await button(wrapper, 'Previous')?.trigger('click');
    expect(wrapper.text()).toContain('page 1 of 3');
  });

  it('returns to the first page when the page size changes', async () => {
    query.list.data = page([viewer()], {
      data: { items: [viewer()], total: 120, page: 1, perPage: 50 },
    });

    const wrapper = await mountView();
    await button(wrapper, 'Next')?.trigger('click');
    expect(wrapper.text()).toContain('page 2 of 3');

    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', '100');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('page 1 of 2');
  });

  it('renders the detail of the selected viewer and closes it again', async () => {
    query.list.data = page([viewer(), viewer({ twitchId: '222', username: 'second' })]);
    query.detail.data = { status: 200, data: viewer({ isSubscriber: true }) };

    const wrapper = await mountView();
    expect(wrapper.text()).not.toContain('Viewer detail');
    expect(wrapper.find('dl').exists()).toBe(false);
    expect(detailEnabled()).toBe(false);

    await nameButton(wrapper, 1)?.trigger('click');

    expect(query.detailLogins).toEqual(['luckyfoxcode']);
    // The hook has to be handed a reactive id - a plain string would freeze the
    // query key and the panel would keep showing whoever was selected first.
    expect(toValue(query.detailTwitchId)).toBe('222');
    expect(detailEnabled()).toBe(true);

    const detail = wrapper.find('dl').text();
    expect(wrapper.text()).toContain('Viewer detail');
    expect(detail).toContain('222');
    expect(detail).toContain('Coins');
    expect(detail).toContain('Last xp');
    expect(detail).toContain('yes');

    await button(wrapper, 'Close')?.trigger('click');
    expect(wrapper.find('dl').exists()).toBe(false);
  });

  it('reports a viewer the detail route does not know', async () => {
    query.list.data = page([viewer()]);
    query.detail.data = { status: 404, data: { message: 'Channel user not found' } };

    const wrapper = await mountView();
    await nameButton(wrapper, 0)?.trigger('click');

    expect(wrapper.text()).toContain('Channel user not found');
    expect(wrapper.find('dl').exists()).toBe(false);
  });

  it('shows a dash instead of Invalid Date for an unparsable timestamp', async () => {
    query.list.data = page([viewer({ lastXpAt: 'not-a-date' })]);

    expect((await mountView()).text()).toContain('—');
  });
});
