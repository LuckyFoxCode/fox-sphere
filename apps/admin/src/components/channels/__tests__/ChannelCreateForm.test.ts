import ChannelCreateForm from '@/components/channels/ChannelCreateForm.vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutate = vi.hoisted(() =>
  vi.fn<(vars: unknown, opts?: { onSuccess?: (...args: unknown[]) => void }) => void>(),
);

vi.mock('@/api/generated/channels/channels', async () => {
  const { ref } = await import('vue');
  return {
    useCreateChannel: () => ({ mutate, isPending: ref(false) }),
  };
});

const mountForm = (props: { onCreated?: () => void } = {}) =>
  mount(ChannelCreateForm, { props });

const submitForm = async (wrapper: ReturnType<typeof mountForm>) => {
  const form = wrapper.find('form').element as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setImmediate(resolve));
};

describe('ChannelCreateForm', () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it('renders the form fields', () => {
    const wrapper = mountForm();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.text()).toContain('Twitch ID');
    expect(wrapper.text()).toContain('Login');
    expect(wrapper.text()).toContain('Display Name');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Bot is moderator');
  });

  it('resets and calls onCreated when the create succeeds with 201', async () => {
    const onCreated = vi.fn<() => void>();
    const wrapper = mountForm({ onCreated });

    await submitForm(wrapper);

    const callbacks = mutate.mock.calls[0]?.[1] as {
      onSuccess?: (response: {
        status: number;
        data: Record<string, unknown>;
        headers: Headers;
      }) => void;
    };
    callbacks?.onSuccess?.({ status: 201, data: { id: 'clx1' }, headers: new Headers() });
    await new Promise((resolve) => setImmediate(resolve));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('Request failed');
  });

  it('shows the server message when the create fails with a 400 carrying a message', async () => {
    const onCreated = vi.fn<() => void>();
    const wrapper = mountForm({ onCreated });

    await submitForm(wrapper);

    const callbacks = mutate.mock.calls[0]?.[1] as {
      onSuccess?: (response: {
        status: number;
        data: { message?: string };
        headers: Headers;
      }) => void;
    };
    callbacks?.onSuccess?.({ status: 400, data: { message: 'Twitch ID is taken' }, headers: new Headers() });
    await new Promise((resolve) => setImmediate(resolve));

    expect(wrapper.text()).toContain('Twitch ID is taken');
    expect(wrapper.text()).not.toContain('Request failed');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the failure carries no message', async () => {
    const wrapper = mountForm();

    await submitForm(wrapper);

    const callbacks = mutate.mock.calls[0]?.[1] as {
      onSuccess?: (response: {
        status: number;
        data: { message?: string };
        headers: Headers;
      }) => void;
    };
    callbacks?.onSuccess?.({ status: 500, data: {}, headers: new Headers() });
    await new Promise((resolve) => setImmediate(resolve));

    expect(wrapper.text()).toContain('Request failed (HTTP 500)');
  });
});
