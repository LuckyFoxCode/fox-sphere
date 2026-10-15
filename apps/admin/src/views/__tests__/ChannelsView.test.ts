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

// useToast calls vue-sonner's toast.success; asserting on this mock proves the
// message reached the toast without depending on its format.
const toastSuccess = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn<(message: string) => void>(), success: toastSuccess },
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
  toastSuccess.mockClear();
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

  it('keeps the create form closed until the button is pressed', () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();

    expect(wrapper.findComponent(ChannelCreateForm).exists()).toBe(false);
    expect(wrapper.text()).toContain('Add channel');
    expect(wrapper.text()).not.toContain('Cancel');
  });

  // One rule rather than one rule plus an exception: an empty list does not open the form.
  it('keeps the form closed on an empty list as well', () => {
    query.data = { status: 200, data: [] };

    expect(mountView().findComponent(ChannelCreateForm).exists()).toBe(false);
  });

  it('reveals the form on click and turns the button into a cancel', async () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();
    await wrapper.find('button[aria-controls="channel-create-form"]').trigger('click');

    expect(wrapper.findComponent(ChannelCreateForm).exists()).toBe(true);
    expect(wrapper.text()).toContain('Cancel');
  });

  it('closes the form again when the toggle is pressed twice', async () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();
    const toggle = wrapper.find('button[aria-controls="channel-create-form"]');

    await toggle.trigger('click');
    await toggle.trigger('click');

    expect(wrapper.findComponent(ChannelCreateForm).exists()).toBe(false);
  });

  it('refetches the list when the form reports a created channel', async () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();
    await wrapper.find('button[aria-controls="channel-create-form"]').trigger('click');

    const onCreated = wrapper.findComponent(ChannelCreateForm).props('onCreated');
    onCreated?.();

    expect(query.refetch).toHaveBeenCalledTimes(1);
  });

  // Without the toast the form just vanishes and the new channel sorts to the end of the list,
  // so a successful create would be indistinguishable from a click that did nothing.
  it('announces the new channel and closes the form once it is created', async () => {
    query.data = { status: 200, data: [channel] };

    const wrapper = mountView();
    await wrapper.find('button[aria-controls="channel-create-form"]').trigger('click');

    wrapper.findComponent(ChannelCreateForm).props('onCreated')?.();
    // The ref flips synchronously; the v-if is re-evaluated on the next tick.
    await wrapper.vm.$nextTick();

    expect(toastSuccess).toHaveBeenCalledWith('Channel added');
    expect(wrapper.findComponent(ChannelCreateForm).exists()).toBe(false);
  });
});
