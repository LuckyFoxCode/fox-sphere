import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
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
      refetch: vi.fn<() => void>(),
    }),
    useCreateChannel: () => ({ mutate: vi.fn<() => void>(), isPending: ref(false) }),
    usePatchChannel: () => ({ mutate: vi.fn<() => void>(), isPending: ref(false) }),
    useDeleteChannel: () => ({
      mutate: vi.fn<() => void>(),
      mutateAsync: vi.fn<() => Promise<unknown>>(),
      isPending: ref(false),
    }),
  };
});

// The shell mounts `TheHeader` and `LogoutButton`, both of which reach for the query client
// that `main.ts` installs, so the mount has to carry it too.
vi.mock('@/api/generated/auth/auth', async () => {
  const { ref } = await import('vue');

  return {
    getGetSessionMeQueryKey: () => ['api', 'auth', 'me'] as const,
    useGetSessionMe: () => ({
      data: ref({
        status: 200,
        // Both fields are real and different: `login` is the handle Twitch assigns,
        // `displayName` is what the person chose. A test that set them equal would pass with
        // the header reading either one.
        data: { login: 'luckyfoxcode', displayName: 'LuckyFoxCode' },
      }),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn<() => void>(),
    }),
  };
});

vi.mock('vue-sonner', () => ({
  Toaster: { name: 'Toaster', template: '<div />' },
  toast: { error: vi.fn<(message: string) => void>(), success: vi.fn<() => void>() },
}));

const App = (await import('../App.vue')).default;

const mountApp = async (path = '/') => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();

  const wrapper = mount(App, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { VueQueryDevtools: true },
    },
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

    // Distinctive ChannelsView content: its toggle button. The create form's own heading is
    // not usable here any more - the form is closed until that button is pressed, so the
    // heading only exists once someone has asked for it. "Add channel" is unique to this view;
    // the channel detail screen's equivalent button reads "Edit channel".
    expect(wrapper.text()).not.toContain('Add channel');

    await wrapper.find('a[href="/channels"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Add channel');
  });

  // "luckyfoxcode" is the handle Twitch assigns; nobody calls themselves that. The header has to
  // read the other field, and this only fails if it kept reading `login` - the two are different
  // strings in the mock for exactly that reason.
  it('shows the Twitch display name in the header, not the login', async () => {
    const wrapper = await mountApp('/');

    expect(wrapper.text()).toContain('LuckyFoxCode');
    expect(wrapper.text()).not.toContain('luckyfoxcode');
  });
});
