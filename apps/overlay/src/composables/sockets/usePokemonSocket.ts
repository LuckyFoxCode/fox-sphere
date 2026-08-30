import type { PokemonAssignedPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { type PokemonEventType, type WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<PokemonEventType>('idle');

const newUserWithPokemon = ref<PokemonAssignedPayload | null>(null);

let isSocketInitialized = false;

export function usePokemonSocket(socketInstance: WidgetSocket) {
  const handleAssigned = (data: PokemonAssignedPayload) => {
    newUserWithPokemon.value = data;
    currentEventType.value = 'assigned';
    setStatusWithTimeout('assigned', 10000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('pokemon:assigned', handleAssigned);

    isSocketInitialized = true;
  }

  return { currentEventType, newUserWithPokemon };
}
