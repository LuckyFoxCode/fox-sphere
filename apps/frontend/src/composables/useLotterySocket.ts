import type {
  ClientToServerEvents,
  LotteryUserDto,
  LotteryWinnerDrawnPayload,
  ServerToClientEvents,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';

export type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

export function useLotterySocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const winners = ref<LotteryUserDto[]>([]);
  const winner = ref<LotteryWinnerDrawnPayload>({ place: 0, twitchId: '', username: '' });
  const currentLotteryStatus = ref<LotteryStatus>('idle');

  let timer: ReturnType<typeof setTimeout> | null = null;

  function resetTimeout(timeoutMs?: number) {
    if (timer) clearTimeout(timer);

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
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
