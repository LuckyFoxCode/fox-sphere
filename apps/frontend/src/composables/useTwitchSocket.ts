import { SOUNDS } from '@/constants/sound';
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
} from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { ref } from 'vue';
import { useSound } from './useSound';

const { playSound } = useSound();

type WidgetEventType = 'idle' | 'reward' | 'raid' | 'follow';

export function useTwitchSocket(
  socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>,
) {
  const isShowWidget = ref(false);
  const currentEventType = ref<WidgetEventType>('idle');
  const raid = ref<TwitchRaidPayload>({
    raiderId: '',
    raiderName: '',
    viewers: 0,
  });
  const reward = ref<TwitchRewardPayload>({
    userId: '',
    username: '',
    rewardTitle: '',
  });

  let timer: ReturnType<typeof setTimeout> | null = null;

  function resetTimeout(timeoutMs?: number) {
    if (timer) clearTimeout(timer);

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        isShowWidget.value = false;
        currentEventType.value = 'idle';
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
    currentEventType.value = 'raid';
    isShowWidget.value = true;
    playSound(SOUNDS.reward);
    resetTimeout(5000);
  });

  socketInstance.on('twitch:reward-redeem', (data) => {
    reward.value = data;
    currentEventType.value = 'reward';
    isShowWidget.value = true;
    playSound(SOUNDS.reward);
    resetTimeout(5000);
  });

  return {
    isShowWidget,
    currentEventType,
    raid,
    reward,
    disconnect: () => socketInstance.disconnect(),
  };
}
