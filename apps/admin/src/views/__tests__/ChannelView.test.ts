import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../../router';

const query = vi.hoisted(() => ({
  data: undefined as { status: number; data?: unknown } | undefined,
  isPending: false,
  isError: false,
  ids: [] as unknown[],
}));

vi.mock('@/api/generated/channels/channels', async () => {
  const { ref, toValue } = await import('vue');

  return {
    useGetChannelById: (id: unknown) => {
      // Record the RESOLVED id: the view passes a computed, and we want to
      // assert the route param reached the hook, not the ref object itself.
      query.ids.push(toValue(id));

      return {
        data: ref(query.data),
        isPending: ref(query.isPending),
        isError: ref(query.isError),
      };
    },
  };
});

const ChannelView = (await import('../ChannelView.vue')).default;

const channel = {
  id: 'clx1',
  twitchId: '191983746',
  login: 'luckyfoxcode',
  displayName: 'LuckyFoxCode',
  status: 'ACTIVE',
  botIsMod: true,
};

const mountView = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/channels/clx1');
  await router.isReady();

  return mount(ChannelView, { global: { plugins: [router] } });
};

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
  query.ids = [];
});

describe('ChannelsView', () => {
  it('passes the route id to the query hook', async () => {
    await mountView();

    expect(query.ids).toEqual(['clx1']);
  });

  it('shows a loading state while the query is pending', async () => {
    query.isPending = true;

    expect((await mountView()).text()).toContain('Loading');
  });

  it('reports a transport failure separately from a bad response', async () => {
    query.isError = true;

    expect((await mountView()).text()).toContain('Could not reach the api');
  });

  it('says so on 404 rather than showing an empty panel', async () => {
    query.data = { status: 404, data: { message: 'Channel not found' } };

    expect((await mountView()).text()).toContain('Channel not found');
  });

  it('surfaces a 500 instead of rendering nothing', async () => {
    query.data = { status: 500, data: { message: 'Internal server error' } };

    const text = (await mountView()).text();
    expect(text).toContain('Request failed (HTTP 500)');
    expect(text).toContain('Internal server error');
  });

  it('render the channel on 200', async () => {
    query.data = { status: 200, data: channel };

    const text = (await mountView()).text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('LuckyFoxCode');
    expect(text).toContain('191983746');
  });
});
