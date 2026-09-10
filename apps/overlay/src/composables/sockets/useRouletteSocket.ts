import { SOUNDS } from '@/constants';
import type { RouletteSpinResultPayload } from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { RouletteStatus, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const SPIN_ANIMATION_MS = 1200;
const SPIN_RESULT_MS = 5000;
const JACKPOT_TAKEOVER_MS = 8000;

const { currentStatus: currentRouletteStatus, setStatusWithTimeout } =
  useWidgetTimer<RouletteStatus>('idle');

const jackpotTotal = ref(1000);
const spinResult = ref<RouletteSpinResultPayload | null>(null);

let isSocketInitialized = false;

export function useRouletteSocket(socketInstance: WidgetSocket) {
  const { playSound } = useSound();

  const handleSpinResult = (data: RouletteSpinResultPayload) => {
    jackpotTotal.value = data.jackpotTotalAfter;
    spinResult.value = data;

    if (data.jackpotWon) {
      currentRouletteStatus.value = 'jackpot';
      playSound(SOUNDS.jackpot);
      setStatusWithTimeout('jackpot', JACKPOT_TAKEOVER_MS);
      return;
    }

    currentRouletteStatus.value = 'spinning';
    setTimeout(() => {
      currentRouletteStatus.value = 'result';
      setStatusWithTimeout('result', SPIN_RESULT_MS);
    }, SPIN_ANIMATION_MS);
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
