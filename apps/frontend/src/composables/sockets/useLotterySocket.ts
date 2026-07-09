import { SOUNDS } from '@/constants';
import {
  type LotteryFinishedPayload,
  type LotteryTicketEarnedPayload,
  type LotteryUserDto,
  type LotteryWinnerDrawnPayload,
} from '@fox-sphere/types';
import { onUnmounted, ref } from 'vue';
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

  const handleTicketEarned = (data: LotteryTicketEarnedPayload) => {
    ticket.value = data;
    currentLotteryStatus.value = 'ticket';
    playSound(SOUNDS.ticket);
    setStatusWithTimeout('ticket', 5000);
  };

  const handleStarted = () => {
    currentLotteryStatus.value = 'started';
    setStatusWithTimeout('started', 4000);
  };

  const handleWinnerDrawn = (data: LotteryWinnerDrawnPayload) => {
    winner.value = data;
    currentLotteryStatus.value = 'drawer';
    setStatusWithTimeout('drawer', 4000);
  };

  const handleFinished = (data: LotteryFinishedPayload) => {
    winners.value = data.winners;
    currentLotteryStatus.value = 'finished';
    setStatusWithTimeout('finished', 5000);
  };

  socketInstance.on('lottery:ticket-earned', handleTicketEarned);
  socketInstance.on('lottery:started', handleStarted);
  socketInstance.on('lottery:winner-drawn', handleWinnerDrawn);
  socketInstance.on('lottery:finished', handleFinished);

  onUnmounted(() => {
    clearActiveTimer();

    socketInstance.off('lottery:ticket-earned', handleTicketEarned);
    socketInstance.off('lottery:started', handleStarted);
    socketInstance.off('lottery:winner-drawn', handleWinnerDrawn);
    socketInstance.off('lottery:finished', handleFinished);
  });

  return {
    ticket,
    winner,
    winners,
    currentLotteryStatus,
  };
}
