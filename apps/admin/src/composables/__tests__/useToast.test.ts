import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'vue-sonner';

vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn<(...args: unknown[]) => void>(), success: vi.fn<(...args: unknown[]) => void>() },
}));

import { useToast } from '../useToast';

const { toastError, toastSuccess } = useToast();

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

describe('useToast', () => {
  it('uses the message of an Error instance', () => {
    toastError(new Error('boom'));

    expect(toast.error).toHaveBeenCalledWith('boom');
  });

  it('uses the message of a plain object with a string message', () => {
    toastError({ message: 'Channel not found' });

    expect(toast.error).toHaveBeenCalledWith('Channel not found');
  });

  it('falls back when the message is not a string', () => {
    toastError({ message: 42 });

    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  it('falls back for an object without a message', () => {
    toastError({ code: 'E123' });

    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  it('falls back for a non-object error', () => {
    toastError('puny error');

    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  it('forwards a success message straight to the toast', () => {
    toastSuccess('Channel updated');

    expect(toast.success).toHaveBeenCalledWith('Channel updated');
  });
});