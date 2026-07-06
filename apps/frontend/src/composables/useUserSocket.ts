import { SOUNDS } from '@/constants';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UserLevelUpPayload,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';
import { useSound } from './useSound';

type WidgetEventType = 'idle' | 'level-up';

export function useUserSocker(socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>) {
  const { playSound } = useSound();

  const currentEventType = ref<WidgetEventType>('idle');
  const levelUp = ref<UserLevelUpPayload>({ userId: '', username: '', newLevel: 0 });

  let timer: ReturnType<typeof setTimeout> | null = null;

  function resetTimeout(timeoutMs?: number) {
    if (timer) clearTimeout(timer);

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        currentEventType.value = 'idle';
      }, timeoutMs);
    }
  }

  socketInstance.on('user:level-up', (data) => {
    levelUp.value = data;
    currentEventType.value = 'level-up';
    playSound(SOUNDS.levelUp);
    resetTimeout(5000);
  });

  return {
    currentEventType,
    levelUp,
    disconnect: () => socketInstance.disconnect(),
  };
}
