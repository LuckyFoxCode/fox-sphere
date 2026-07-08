import { SOUNDS } from '@/constants';
import {
  type LotteryTicketEarnedPayload,
  type LotteryUserDto,
  type LotteryWinnerDrawnPayload,
} from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { LotteryStatus, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

export function useLotterySocket(socketInstance: WidgetSocket) {
  const {
    currentStatus: currentLotteryStatus,
    setStatusWithTimeout,
    clearActiveTimer,
  } = useWidgetTimer<LotteryStatus>('idle');
  const { playSound } = useSound();

  const ticket = ref<LotteryTicketEarnedPayload | null>(null);
  const winners = ref<LotteryUserDto[]>([]);
  const winner = ref<LotteryWinnerDrawnPayload | null>(null);

  socketInstance.on('lottery:ticket-earned', (data) => {
    ticket.value = data;
    currentLotteryStatus.value = 'ticket';
    playSound(SOUNDS.ticket);
    setStatusWithTimeout('ticket', 5000);
  });

  socketInstance.on('lottery:started', () => {
    currentLotteryStatus.value = 'started';
    setStatusWithTimeout('started', 4000);
  });

  socketInstance.on('lottery:winner-drawn', (data) => {
    winner.value = data;
    currentLotteryStatus.value = 'drawer';
    setStatusWithTimeout('drawer', 4000);
  });

  socketInstance.on('lottery:finished', (data) => {
    winners.value = data.winners;
    currentLotteryStatus.value = 'finished';
    setStatusWithTimeout('finished', 5000);
  });

  return {
    ticket,
    winner,
    winners,
    currentLotteryStatus,
    disconnect: () => {
      clearActiveTimer();
      socketInstance.disconnect();
    },
  };
}
