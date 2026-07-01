import type { Socket } from 'socket.io-client';
import { ref } from 'vue';
import type { ServerToClientEvents, ClientToServerEvents } from '@fox-sphere/shared-schemas';

export interface Winner {
  place: number;
  twitchId: string;
  username: string;
}
export type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

export function useLotterySocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const winners = ref<Winner[]>([]);
  const winner = ref<Winner>({ place: 0, twitchId: '', username: '' });
  const currentLotteryStatus = ref<LotteryStatus>('idle');
  const timer = ref<ReturnType<typeof setTimeout> | null>(null);

  function resetTimeout(timeoutMs?: number) {
    if (timer.value) clearTimeout(timer.value);

    if (timeoutMs !== undefined) {
      timer.value = setTimeout(() => {
        currentLotteryStatus.value = 'idle';
      }, timeoutMs);
    }
  }

  socketInstance.on('lottery:started', () => {
    currentLotteryStatus.value = 'started';
    resetTimeout(5000);
  });

  socketInstance.on('lottery:winner-drawn', (data) => {
    winner.value = data;
    currentLotteryStatus.value = 'drawer';
    resetTimeout(4000);
  });

  socketInstance.on('lottery:finished', (data) => {
    winners.value = data.winners;
    currentLotteryStatus.value = 'finished';
    resetTimeout(5000);
  });

  return {
    winner,
    winners,
    currentLotteryStatus,
    disconnect: () => socketInstance.disconnect(),
  };
}
