import { SOUNDS } from '@/constants/sound';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TwitchRewardPayload,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';
import { useSound } from './useSound';

const { playSound } = useSound();

export function useTwitchSocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const isShowWidget = ref(false);
  const timer = ref<ReturnType<typeof setTimeout> | null>(null);
  const redeemData = ref<TwitchRewardPayload>({
    userId: 'dasdasd',
    username: 'LuckyFoxCode',
    rewardTitle: 'Coin Exchange',
  });

  function resetTimeout(timeoutMs?: number) {
    if (timer.value) clearTimeout(timer.value);

    if (timeoutMs !== undefined) {
      timer.value = setTimeout(() => {
        isShowWidget.value = false;
      }, timeoutMs);
    }
  }

  socketInstance.on('twitch:follow', (data) => {
    console.log(data);
    isShowWidget.value = true;
    resetTimeout(5000);
  });

  socketInstance.on('twitch:raid', (data) => {
    console.log(data);
    isShowWidget.value = true;
    resetTimeout(5000);
  });

  socketInstance.on('twitch:reward-redeem', (data) => {
    redeemData.value = data;
    isShowWidget.value = true;
    playSound(SOUNDS.reward);
    resetTimeout(5000);
  });

  return {
    isShowWidget,
    redeemData,
    disconnect: () => socketInstance.disconnect(),
  };
}
