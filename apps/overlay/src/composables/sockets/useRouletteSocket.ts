import { ROULETTE_RESULT_SHOW_MS, ROULETTE_SPIN_ANIMATION_MS } from '@fox-sphere/types';
import { SOUNDS } from '@/constants';
import type { RouletteSpinResultPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { RouletteStatus, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const JACKPOT_TAKEOVER_MS = 8000;

const {
  currentStatus: currentRouletteStatus,
  setStatusWithTimeout,
  clearActiveTimer,
} = useWidgetTimer<RouletteStatus>('idle');

const jackpotTotal = ref(1000);
const spinResult = ref<RouletteSpinResultPayload | null>(null);

// Колесо крутится ROULETTE_SPIN_ANIMATION_MS — тот же тайминг держит бот
// перед отправкой чат-сообщения, поэтому ответ в чат приходит в момент остановки.
let phaseTimer: ReturnType<typeof setTimeout> | null = null;

let isSocketInitialized = false;

export function useRouletteSocket(socketInstance: WidgetSocket) {
  const { playSound } = useSound();

  const handleSpinResult = (data: RouletteSpinResultPayload) => {
    jackpotTotal.value = data.jackpotTotalAfter;
    spinResult.value = data;

    if (phaseTimer) clearTimeout(phaseTimer);
    clearActiveTimer();

    currentRouletteStatus.value = 'spinning';
    phaseTimer = setTimeout(() => {
      if (data.jackpotWon) {
        currentRouletteStatus.value = 'jackpot';
        playSound(SOUNDS.jackpot);
        setStatusWithTimeout('jackpot', JACKPOT_TAKEOVER_MS);
        return;
      }

      currentRouletteStatus.value = 'result';
      setStatusWithTimeout('result', ROULETTE_RESULT_SHOW_MS);
    }, ROULETTE_SPIN_ANIMATION_MS);
  };

  const fetchJackpotTotal = () => {
    socketInstance.emit('stream:get-system-state', {}, (response) => {
      jackpotTotal.value = response.jackpotTotal;
    });
  };

  if (!isSocketInitialized) {
    socketInstance.on('roulette:spin-result', handleSpinResult);

    if (socketInstance.connected) {
      fetchJackpotTotal();
    } else {
      socketInstance.on('connect', fetchJackpotTotal);
    }

    isSocketInitialized = true;
  }

  return {
    jackpotTotal,
    spinResult,
    currentRouletteStatus,
  };
}
