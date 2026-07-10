import { SOUNDS } from '@/constants';
import type { UserLevelUpPayload } from '@fox-sphere/types';
import { onUnmounted, ref } from 'vue';
import { useSound } from '../useSound';
import type { UserEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

export function useUserSocker(socketInstance: WidgetSocket) {
  const {
    currentStatus: currentEventType,
    setStatusWithTimeout,
    clearActiveTimer,
  } = useWidgetTimer<UserEventType>('idle');
  const { playSound } = useSound();

  const levelUp = ref<UserLevelUpPayload | null>(null);

  const handleLevelUp = (data: UserLevelUpPayload) => {
    levelUp.value = data;
    currentEventType.value = 'level-up';
    playSound(SOUNDS.levelUp);
    setStatusWithTimeout('level-up', 5000);
  };

  socketInstance.on('user:level-up', handleLevelUp);

  onUnmounted(() => {
    clearActiveTimer();

    socketInstance.off('user:level-up', handleLevelUp);
  });

  return {
    currentEventType,
    levelUp,
  };
}
