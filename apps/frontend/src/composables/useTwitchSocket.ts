import { SOUNDS } from '@/constants/sound';
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type TwitchFollowPayload,
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
  const currentEventType = ref<WidgetEventType>('idle');
  const follow = ref<TwitchFollowPayload>({ userId: '', username: '' });
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
        currentEventType.value = 'idle';
      }, timeoutMs);
    }
  }

  socketInstance.on('twitch:follow', (data) => {
    follow.value = data;
    currentEventType.value = 'follow';
    playSound(SOUNDS.follow);
    resetTimeout(5000);
  });

  socketInstance.on('twitch:raid', (data) => {
    raid.value = data;
    currentEventType.value = 'raid';
    playSound(SOUNDS.raid);
    resetTimeout(5000);
  });

  socketInstance.on('twitch:reward-redeem', (data) => {
    reward.value = data;
    currentEventType.value = 'reward';
    playSound(SOUNDS.reward);
    resetTimeout(5000);
  });

  return {
    currentEventType,
    follow,
    raid,
    reward,
    disconnect: () => socketInstance.disconnect(),
  };
}
