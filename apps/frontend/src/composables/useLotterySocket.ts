import {
  type ClientToServerEvents,
  type LotteryTicketEarnedPayload,
  type LotteryUserDto,
  type LotteryWinnerDrawnPayload,
  type ServerToClientEvents,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';

export type LotteryStatus = 'idle' | 'ticket' | 'started' | 'drawer' | 'finished';

export function useLotterySocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const currentLotteryStatus = ref<LotteryStatus>('idle');
  const ticket = ref<LotteryTicketEarnedPayload>({ twitchId: '', username: '' });
  const winners = ref<LotteryUserDto[]>([]);
  const winner = ref<LotteryWinnerDrawnPayload>({ place: 0, twitchId: '', username: '' });

  let timer: ReturnType<typeof setTimeout> | null = null;

  function resetTimeout(timeoutMs?: number) {
    if (timer) clearTimeout(timer);

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        currentLotteryStatus.value = 'idle';
      }, timeoutMs);
    }
  }

  socketInstance.on('lottery:ticket-earned', (data) => {
    ticket.value = data;
    currentLotteryStatus.value = 'ticket';
    resetTimeout(5000);
  });

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
    ticket,
    winner,
    winners,
    currentLotteryStatus,
    disconnect: () => socketInstance.disconnect(),
  };
}
