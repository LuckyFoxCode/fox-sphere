import { SOUNDS } from '@/constants';
import type { UserLevelUpPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { UserEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<UserEventType>('level-up');

const levelUp = ref<UserLevelUpPayload | null>({
  newLevel: 5,
  userId: '123',
  username: 'Mika4334',
  pokemon: {
    isReadyToEvolve: false,
    xp: 0,
    lvl: 1,
    speciesName: 'Bird',
    spriteUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/16.gif',
  },
});

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
