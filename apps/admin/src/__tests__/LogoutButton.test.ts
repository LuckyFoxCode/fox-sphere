import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type GlobalMountOptions } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { getGetSessionMeQueryKey } from '@/api/generated/auth/auth';

vi.mock('@/lib/session', () => ({
  login: vi.fn<() => void>(),
  logout: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

const LogoutButton = (await import('../components/nav/LogoutButton.vue')).default;

const { logout } = await import('@/lib/session');
const { login } = await import('@/lib/session');

// `useQueryClient` resolves the client through injection, so the plugin is not optional here -
// without it `setup()` throws before the first assertion. The stub declares no `emits`, so the
// parent's `@click` reaches it as a native listener and fires exactly once.
const mountWith = (state: 'loading' | 'admin' | 'guest' | 'error') => {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  // Started on a different route so a redirect home is observable rather than a no-op.
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/channels', component: { template: '<div>channels</div>' } },
    ],
  });
  void router.push('/channels');

  const global: GlobalMountOptions = {
    stubs: { SidebarMenuButton: { template: '<button><slot /></button>' } },
    plugins: [[VueQueryPlugin, { queryClient }], router],
  };

  return { wrapper: mount(LogoutButton, { props: { state }, global }), invalidate, router };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LogoutButton', () => {
  it('offers Logout and posts when somebody is signed in', async () => {
    const { wrapper } = mountWith('admin');

    expect(wrapper.text()).toContain('Logout');
    expect(wrapper.text()).not.toContain('Login');

    await wrapper.find('button').trigger('click');

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('refetches the session after a logout, or the button claims a dead session forever', async () => {
    const { wrapper, invalidate } = mountWith('admin');

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: getGetSessionMeQueryKey() });
  });

  // Refetching alone left you where you were, on a page whose every query now answers 401 -
  // which reads as a broken panel rather than a signed-out one.
  it('leaves the page you were on, so signing out feels like signing out', async () => {
    const { wrapper, router } = mountWith('admin');

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/');
  });

  // The redirect is not a substitute for the refetch: the header reads the session query, and
  // without invalidation the name would stay whoever you were.
  it('both redirects and refetches, rather than trading one for the other', async () => {
    const { wrapper, invalidate, router } = mountWith('admin');

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('offers Login and starts the OAuth flow when nobody is signed in', async () => {
    const { wrapper } = mountWith('guest');

    expect(wrapper.text()).toContain('Login');
    expect(wrapper.text()).not.toContain('Logout');

    await wrapper.find('button').trigger('click');

    expect(login).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });

  it('renders no control while the answer is still unknown', () => {
    const { wrapper } = mountWith('loading');

    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders no control when the backend is broken', async () => {
    // A dead `apps/api` is not a guest. Offering Login here would send the user to a Twitch
    // window against an API that is not running to complete the login.
    const { wrapper } = mountWith('error');

    expect(wrapper.find('button').exists()).toBe(false);

    expect(login).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});
