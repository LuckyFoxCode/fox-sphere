import type { StreamXpUpdatePayload } from '@fox-sphere/types';
import { ref } from 'vue';
import type { StreamEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType } = useWidgetTimer<StreamEventType>('idle');

const level = ref(1);
const newXp = ref(0);
const maxXp = ref(0);
const isLoading = ref(true);

let isSocketInitialized = false;

export function useStreamSocket(socketInstance: WidgetSocket) {
  const handleXpUpdate = (data: StreamXpUpdatePayload) => {
    level.value = data.lvl;
    newXp.value = data.newXp;
    maxXp.value = data.maxXp;
    currentEventType.value = 'xp-update';
  };

  const fetchInitialState = () => {
    socketInstance.emit('stream:get-system-state', {}, (response) => {
      level.value = response.lvl;
      newXp.value = response.newXp;
      maxXp.value = response.maxXp;
      isLoading.value = false;
    });
  };

  if (!isSocketInitialized) {
    socketInstance.on('stream:xp-updated', handleXpUpdate);

    if (socketInstance.connected) {
      fetchInitialState();
    } else {
      socketInstance.on('connect', fetchInitialState);
    }

    isSocketInitialized = true;
  }

  return {
    level,
    newXp,
    maxXp,
    isLoading,
  };
}
