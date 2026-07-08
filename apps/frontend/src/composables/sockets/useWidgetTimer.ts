import { ref, type Ref } from 'vue';

export function useWidgetTimer<T extends string>(initialStatus: T) {
  const currentStatus = ref(initialStatus) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function setStatusWithTimeout(newStatus: T, timeoutMs: number) {
    currentStatus.value = newStatus;

    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      currentStatus.value = initialStatus;
    }, timeoutMs);
  }

  function clearActiveTimer() {
    if (timer) clearTimeout(timer);
  }

  return {
    currentStatus,
    clearActiveTimer,
    setStatusWithTimeout,
  };
}
