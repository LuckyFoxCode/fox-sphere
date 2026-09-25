import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'vue-sonner';
import ConfirmDialog from '../ConfirmDialog.vue';

vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn<(...args: unknown[]) => void>() },
}));

const dialogContent = () =>
  document.querySelector('[data-slot="alert-dialog-content"]') as HTMLElement | null;

const bodyButtons = () => [...document.querySelectorAll<HTMLButtonElement>('button')];

const buttonByText = (text: string) => bodyButtons().find((b) => b.textContent?.includes(text));

let wrapper: VueWrapper | null = null;

const mountDialog = async (onConfirm: () => Promise<unknown> | void) => {
  wrapper = mount(ConfirmDialog, {
    props: { onConfirm },
    slots: { default: '<button type="button">Open dialog</button>' },
    attachTo: document.body,
  });
  await wrapper.find('button').trigger('click');
  await flushPromises();
  return wrapper;
};

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('ConfirmDialog', () => {
  it('opens the dialog when the trigger is clicked', async () => {
    await mountDialog(() => undefined);

    expect(dialogContent()).not.toBeNull();
    expect(document.body.textContent).toContain('Are you sure?');
    expect(document.body.textContent).toContain('This action cannot be undone.');
  });

  it('calls onConfirm and closes the dialog when it resolves', async () => {
    const onConfirm = vi.fn<() => Promise<void>>();
    await mountDialog(onConfirm);

    await buttonByText('Confirm')?.click();
    await flushPromises();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(dialogContent()).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and toasts the error when onConfirm rejects', async () => {
    const onConfirm = vi.fn<() => Promise<never>>(() => Promise.reject(new Error('boom')));
    await mountDialog(onConfirm);

    await buttonByText('Confirm')?.click();
    await flushPromises();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('boom');
    expect(dialogContent()).not.toBeNull();
  });

  it('disables the confirm button and shows a spinner while pending', async () => {
    await mountDialog(() => new Promise<never>(() => {}));

    const confirmButton = buttonByText('Confirm');
    expect(confirmButton).toBeDefined();

    await confirmButton?.click();
    await flushPromises();

    expect(confirmButton?.disabled).toBe(true);
    expect(confirmButton?.querySelector('.animate-spin')).not.toBeNull();
  });
});