import type { ProfileShowPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { type ProfileEventType, type WidgetSocket } from './types';

/**
 * Прототип карточки профиля: показ и очередь живут здесь, а не в компоненте.
 *
 * Почему так, а не `useWidgetTimer` как в `useHeroSocket`: карточку надо не просто погасить,
 * а передать место следующей — очередь, дедупликация и пауза между карточками не помещаются
 * в один таймер статуса.
 *
 * - одновременно на экране одна карточка (`activeProfile`);
 * - ждут не больше `MAX_QUEUE`, всё сверх лимита молча отбрасывается (в чате об этом молчим —
 *   прототип, и подтверждение команды уже ушло);
 * - один и тот же `userId` не показывается дважды, пока его карточка на экране или в очереди.
 */
const PROFILE_DISPLAY_MS = 6000;
// Даёт уехать предыдущей карточке: `<Transition mode="out-in">` ждёт уход, но пустой
// промежуток между карточками всё равно нужен, иначе следующая не смонтируется.
const PROFILE_GAP_MS = 400;
const MAX_QUEUE = 5;

const currentEventType = ref<ProfileEventType>('idle');
const activeProfile = ref<ProfileShowPayload | null>(null);

const queue: ProfileShowPayload[] = [];
const shownUserIds = new Set<string>();

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let isSocketInitialized = false;

const display = (profile: ProfileShowPayload): void => {
  activeProfile.value = profile;
  currentEventType.value = 'show';
  hideTimer = setTimeout(finishCurrent, PROFILE_DISPLAY_MS);
};

const finishCurrent = (): void => {
  const finished = activeProfile.value;

  activeProfile.value = null;
  currentEventType.value = 'idle';
  hideTimer = null;

  if (finished) shownUserIds.delete(finished.userId);

  if (queue.length === 0) return;

  hideTimer = setTimeout(() => {
    hideTimer = null;
    const next = queue.shift();

    if (next) display(next);
  }, PROFILE_GAP_MS);
};

const handleShow = (data: ProfileShowPayload): void => {
  if (shownUserIds.has(data.userId)) return;

  const isIdle = !activeProfile.value && queue.length === 0;

  if (!isIdle) {
    if (queue.length >= MAX_QUEUE) return;

    shownUserIds.add(data.userId);
    queue.push(data);
    return;
  }

  // Между карточками уже стоит пауза — её надо отменить, иначе новая карточка подождёт
  // впустую.
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  shownUserIds.add(data.userId);
  display(data);
};

export function useProfileSocket(socketInstance: WidgetSocket) {
  if (!isSocketInitialized) {
    socketInstance.on('profile:show', handleShow);

    isSocketInitialized = true;
  }

  return { activeProfile, currentEventType };
}
