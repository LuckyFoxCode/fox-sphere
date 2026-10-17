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
    // Grouped, so four digits read as a quantity at a glance rather than a column of digits.
    expect(text).toContain('4,200');
    expect(text).toContain('910');
    expect(text).toContain('Progress');
    expect(text).toContain('Economy');
    expect(text).toContain('Status');
  });

  // The value is read off the row that owns the label, not off the whole page: `coins` renders
  // "4,200" on the same screen, so a bare `toContain('200')` would pass on the wrong row.
  const fieldValue = (wrapper: Awaited<ReturnType<typeof mountView>>, label: string) => {
    const term = wrapper.findAll('dt').find((cell) => cell.text().trim() === label);

    return term?.element.nextElementSibling?.textContent?.trim() ?? null;
  };

  // Win rate was totalWin / (totalWin + totalLoss) while totalLoss was wager volume, so the
  // fraction collapsed to RTP / (1 + RTP) — the same constant for everyone who had ever spun.
  // Net is wagered minus won, because that is the balance delta and it is what differs per viewer.
  //
  // The numbers are the real ones from the complaint that started this: 55 spins, 3 930 won,
  // 5 500 recorded as loss. 55 × 100 = 5 500 wagered, so the net is exactly −1 570 — and it is
  // read that way for a legacy row, whose totalLoss is still wager volume, as well as for a new
  // one. Deriving it from `totalWin - totalLoss` would report −1 570 for that row by accident and
  // a positive number for every row spun after the fix, which is the direction that lies.
  it('shows the net of wins against the amount wagered', async () => {
    query.detail.data = {
      status: 200,
      data: viewer({ spinsCount: 55, totalWin: 3_930, totalLoss: 5_500 }),
    };

    const wrapper = await mountView();
    const text = wrapper.text();

    expect(text).not.toContain('Win rate');
    expect(fieldValue(wrapper, 'Net')).toBe('-1,570');
  });

  // A viewer who has never spun has no net at all, and "NaN" would read as a bug.
  it('leaves the net blank when nothing has been played', async () => {
    query.detail.data = {
      status: 200,
      data: viewer({ spinsCount: 0, totalWin: 0, totalLoss: 0 }),
    };

    const wrapper = await mountView();
    const text = wrapper.text();

    expect(text).toContain('Net');
    expect(fieldValue(wrapper, 'Net')).toBe('—');
    expect(text).not.toContain('NaN');
  });

  // totalLoss no longer decides this number, so a row where it disagrees with the wagered amount
  // must still read as the balance does. 20 spins wager 2 000 and won 1 000, so the viewer is down.
  it('does not let the loss column decide the net', async () => {
    query.detail.data = {
      status: 200,
      data: viewer({ spinsCount: 20, totalWin: 1_000, totalLoss: 0 }),
    };

    expect(fieldValue(await mountView(), 'Net')).toBe('-1,000');
  });

  // The whole reason the six yes/no rows are gone: a viewer with a permanent VIP and one with
  // nothing produced the same six "no" strings before.
  it('shows only the flags that are set, and no yes/no rows', async () => {
    query.detail.data = {
      status: 200,
      data: viewer({
        isPermanentVip: true,
        hasTicket: true,
        isMod: false,
        isFounder: false,
        isSubscriber: false,
        isLuckyVip: false,
      }),
    };

    const text = (await mountView()).text();

    expect(text).toContain('vip');
    expect(text).toContain('ticket');
    expect(text).not.toContain('mod');
    expect(text).not.toContain('founder');
    expect(text).not.toContain('lucky vip');
    expect(text).not.toContain('Subscriber');
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