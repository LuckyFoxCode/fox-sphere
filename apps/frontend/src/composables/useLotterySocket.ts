import type { Socket } from 'socket.io-client';
import { ref } from 'vue';

export interface Winner {
  place: number;
  twitchId: string;
  username: string;
}
export type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

export interface LotteryEventsMap {
  'lottery:started': number;
  'lottery:winner-drawn': Winner;
  'lottery:finished': { winners: Winner[] };
}

export function useLotterySocket(socketInstance: Socket) {
  const winners = ref<Winner[]>([]);
  const winner = ref<Winner>({ place: 0, twitchId: '', username: '' });
  const currentLotteryStatus = ref<LotteryStatus>('idle');
  const timer = ref<ReturnType<typeof setTimeout> | null>(null);

  function onLotteryEvent<T extends keyof LotteryEventsMap>(
    eventName: T,
    handler: (payload: LotteryEventsMap[T]) => void,
    timeoutMs?: number,
  ) {
    socketInstance.on(eventName, ((payload: LotteryEventsMap[T]) => {
      if (timer.value) clearInterval(timer.value);

      handler(payload);
      if (timeoutMs !== undefined) {
        timer.value = setTimeout(() => {
          currentLotteryStatus.value = 'idle';
        }, timeoutMs);
      }
    }) as any);
  }

  onLotteryEvent(
    'lottery:started',
    () => {
      currentLotteryStatus.value = 'started';
    },
    5000,
  );

  onLotteryEvent(
    'lottery:winner-drawn',
    (data: Winner) => {
      winner.value = data;
      currentLotteryStatus.value = 'drawer';
    },
    4000,
  );

  onLotteryEvent(
    'lottery:finished',
    (data: { winners: Winner[] }) => {
      winners.value = data.winners;
      currentLotteryStatus.value = 'finished';
    },
    5000,
  );

  return {
    winner,
    winners,
    currentLotteryStatus,
    disconnect: () => socketInstance.disconnect(),
  };
}
