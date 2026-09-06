import ChannelCreateForm from '@/components/channels/ChannelCreateForm.vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../../router';

// Typed mock: vitest checks the factory against the module's real exports,
// so a typo in a hook name fails the type-check instead of the runtime.
const query = vi.hoisted(() => ({
  data: undefined as { status: number; data?: unknown } | undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn<() => void>(),
}));

vi.mock('@/api/generated/channels/channels', async () => {
  const { ref } = await import('vue');

  return {
    useListChannels: () => ({
      data: ref(query.data),
      isPending: ref(query.isPending),
      isError: ref(query.isError),
      refetch: query.refetch,
    }),
    useCreateChannel: () => ({ mutate: vi.fn<() => void>(), isPending: ref(false) }),
  };
});

const ChannelsView = (await import('../ChannelsView.vue')).default;

const channel = {
  id: 'clx1',
  twitchId: '191983746',
  login: 'luckyfoxcode',
  displayName: 'LuckyFoxCode',
  status: 'ACTIVE',
  botIsMod: true,
};

// ChannelList renders RouterLink, so the view needs a live router to mount.
const mountView = () =>
  mount(ChannelsView, {
    global: {
      plugins: [createRouter({ history: createMemoryHistory(), routes })],
    },
  });

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
  query.refetch.mockClear();
});

describe('ChannelsView', () => {
  it('shows a loading state while the query is pending', () => {
    query.isPending = true;

    expect(mountView().text()).toContain('Loading');
  });

  it('reports a transport failure separately from a bad response', () => {
    query.isError = true;

    expect(mountView().text()).toContain('Could not reach the api');
  });

  // The fetch client resolves on every status - a 500 must not look like an empty list.
  it('surfaces a 500 instead of rendering nothing', () => {
    query.data = { status: 500, data: { message: 'Internal server error' } };

    const text = mountView().text();
    expect(text).toContain('500');
    expect(text).toContain('Internal server error');
  });

  it('renders the channels on 200', () => {
    query.data = {
      status: 200,
      data: [channel, { ...channel, id: 'clx2', login: 'second', displayName: 'Second' }],
    };

    const text = mountView().text();
    expect(text).toContain('luckyfoxcode');
    expect(text).toContain('second');
  });

  it('shows the empty state on 200 with no channels', () => {
    query.data = { status: 200, data: [] };

    expect(mountView().text()).toContain('No channels yet');
  });

  it('surfaces undocumented statuses through the failure branch', () => {
    query.data = { status: 502 };

    expect(mountView().text()).toContain('Request failed (HTTP 502)');
  });

  it('refetches the list when the form reports a created channel', async () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();
    const onCreated = wrapper.findComponent(ChannelCreateForm).props('onCreated');
    onCreated?.();

    expect(query.refetch).toHaveBeenCalledTimes(1);
  });
});
