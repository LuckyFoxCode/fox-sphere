import type { HeroAssignedPayload, HeroChangedPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { applyHeroChange } from '../useHeroOverlay';
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

  const handleChanged = (data: HeroChangedPayload) => {
    applyHeroChange(data.twitchId, data.heroId);
  };

  if (!isSocketInitialized) {
    socketInstance.on('hero:assigned', handleAssigned);
    socketInstance.on('hero:changed', handleChanged);

    isSocketInitialized = true;
  }

  return { currentEventType, newUserWithHero };
}
