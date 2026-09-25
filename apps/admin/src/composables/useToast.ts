import { toast } from 'vue-sonner';

function isMessageObject(error: unknown): error is { message?: unknown } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isMessageObject(error)) {
    const { message } = error;
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong';
}

export const useToast = () => {
  const toastError = (error: unknown) => {
    toast.error(extractMessage(error));
  };

  const toastSuccess = (message: string) => {
    toast.success(message);
  };

  return { toastError, toastSuccess };
};