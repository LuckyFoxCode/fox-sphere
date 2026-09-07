import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../router';

const query = vi.hoisted(() => ({
  data: undefined as { status: number; data?: unknown } | undefined,
  isPending: false,
  isError: false,
}));

// Real refs, not plain objects: a template only unwraps refs, so `{ value: false }`
// would read as truthy and every case would render the loading branch.
vi.mock('@/api/generated/channels/channels', async () => {
  const { ref } = await import('vue');

  return {
    useListChannels: () => ({
      data: ref(query.data),
      isPending: ref(query.isPending),
      isError: ref(query.isError),
      refetch: vi.fn<() => void>(),
    }),
    useGetChannelById: () => ({
      data: ref(query.data),
      isPending: ref(query.isPending),
      isError: ref(query.isError),
    }),
    useCreateChannel: () => ({ mutate: vi.fn<() => void>(), isPending: ref(false) }),
  };
});

const App = (await import('../App.vue')).default;

const mountApp = async (path = '/') => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();

  const wrapper = mount(App, {
    global: { plugins: [router], stubs: { VueQueryDevtools: true } },
  });

  return wrapper;
};

beforeEach(() => {
  query.data = undefined;
  query.isPending = false;
  query.isError = false;
});

describe('App', () => {
  it('renders the shell with both nav links', async () => {
    const wrapper = await mountApp();

    expect(wrapper.text()).toContain('Fox Sphere Admin');
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/channels');
  });

  it('renders HomeView with nav cards', async () => {
    const wrapper = await mountApp('/');

    expect(wrapper.text()).toContain('Dashboard');
    expect(wrapper.text()).toContain('Channels');
  });

  it('routes /channels to ChannelsView and lets the nav link reach it', async () => {
    const wrapper = await mountApp('/');

    // Distinctive ChannelsView content: the create-form heading.
    expect(wrapper.text()).not.toContain('Create new channel:');

    await wrapper.find('a[href="/channels"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Create new channel:');
  });
});
