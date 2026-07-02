import type {
  ClientToServerEvents,
  LotteryWinnerDrawnPayload,
  ServerToClientEvents,
  TwitchUserDto,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';

export type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

export function useLotterySocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const winners = ref<TwitchUserDto[]>([]);
  const winner = ref<LotteryWinnerDrawnPayload>({ place: 0, twitchId: '', username: '' });
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
    resetTimeout(4000);
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
