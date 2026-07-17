import type { StreamXpUpdatePayload } from '@fox-sphere/types';
import { ref } from 'vue';
import type { StreamEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType } = useWidgetTimer<StreamEventType>('idle');

const xpData = ref<StreamXpUpdatePayload | null>(null);

let isSocketInitialized = false;

export function useStreamSocket(socketInstance: WidgetSocket) {
  const handleXpUpdate = (data: StreamXpUpdatePayload) => {
    xpData.value = data;
    currentEventType.value = 'xp-update';
  };

  if (!isSocketInitialized) {
    socketInstance.on('stream:xp-updated', handleXpUpdate);

    isSocketInitialized = true;
  }

  return {
    xpData,
  };
}
