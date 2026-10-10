import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({
  logout: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

const LogoutButton = (await import('../components/nav/LogoutButton.vue')).default;

const mountButton = (buttonTemplate: string) =>
  mount(LogoutButton, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: {
        SidebarMenuButton: { template: buttonTemplate },
      },
    },
  });

describe('LogoutButton', () => {
  it('renders a button labelled Logout', () => {
    const wrapper = mountButton('<button><slot /></button>');

    expect(wrapper.text()).toContain('Logout');
  });

  it('calls the session logout when clicked', async () => {
    const { logout } = await import('@/lib/session');

    const wrapper = mountButton('<button @click="$emit(\'click\')"><slot /></button>');

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(logout).toHaveBeenCalled();
  });
});
