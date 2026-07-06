import { SOUNDS } from '@/constants/sound';
import {
  type TwitchFollowPayload,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
} from '@fox-sphere/types';
import { ref } from 'vue';
import { useSound } from '../useSound';
import type { TwitchEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { playSound } = useSound();

export function useTwitchSocket(socketInstance: WidgetSocket) {
  const {
    currentStatus: currentEventType,
    clearActiveTimer,
    setStatusWithTimeout,
  } = useWidgetTimer<TwitchEventType>('idle');

  const follow = ref<TwitchFollowPayload | null>(null);
  const raid = ref<TwitchRaidPayload | null>(null);
  const reward = ref<TwitchRewardPayload | null>(null);

  socketInstance.on('twitch:follow', (data) => {
    follow.value = data;
    currentEventType.value = 'follow';
    playSound(SOUNDS.follow);
    setStatusWithTimeout('follow', 5000);
  });

  socketInstance.on('twitch:raid', (data) => {
    raid.value = data;
    currentEventType.value = 'raid';
    playSound(SOUNDS.raid);
    setStatusWithTimeout('raid', 5000);
  });

  socketInstance.on('twitch:reward-redeem', (data) => {
    reward.value = data;
    currentEventType.value = 'reward';
    playSound(SOUNDS.reward);
    setStatusWithTimeout('reward', 5000);
  });

  return {
    currentEventType,
    follow,
    raid,
    reward,
    disconnect: () => {
      clearActiveTimer();
      socketInstance.disconnect();
    },
  };
}
