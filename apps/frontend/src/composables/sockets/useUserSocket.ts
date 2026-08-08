import { SOUNDS } from '@/constants';
import type { UserLevelUpPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { UserEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<UserEventType>('idle');

const levelUp = ref<UserLevelUpPayload | null>(null);

let isSocketInitialized = false;

export function useUserSocket(socketInstance: WidgetSocket) {
  const { playSound } = useSound();

  const handleLevelUp = (data: UserLevelUpPayload) => {
    levelUp.value = data;
    currentEventType.value = 'level-up';
    playSound(SOUNDS.levelUp);
    setStatusWithTimeout('level-up', 5000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('user:level-up', handleLevelUp);

    isSocketInitialized = true;
  }

  return {
    currentEventType,
    levelUp,
  };
}
