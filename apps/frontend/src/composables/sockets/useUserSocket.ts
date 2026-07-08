import { SOUNDS } from '@/constants';
import type { UserLevelUpPayload } from '@fox-sphere/types';
import { ref } from 'vue';
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

  socketInstance.on('user:level-up', (data) => {
    levelUp.value = data;
    currentEventType.value = 'level-up';
    playSound(SOUNDS.levelUp);
    setStatusWithTimeout('level-up', 5000);
  });

  return {
    currentEventType,
    levelUp,
    disconnect: () => {
      clearActiveTimer();
      socketInstance.disconnect();
    },
  };
}
