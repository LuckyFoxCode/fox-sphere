import type { HeroAssignedPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { type HeroEventType, type WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<HeroEventType>('idle');

const newUserWithHero = ref<HeroAssignedPayload | null>(null);

let isSocketInitialized = false;

export function useHeroSocket(socketInstance: WidgetSocket) {
  const handleAssigned = (data: HeroAssignedPayload) => {
    newUserWithHero.value = data;
    currentEventType.value = 'assigned';
    setStatusWithTimeout('assigned', 10000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('hero:assigned', handleAssigned);

    isSocketInitialized = true;
  }

  return { currentEventType, newUserWithHero };
}
