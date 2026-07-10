import { SOUNDS } from '@/constants/sound';
import {
  type TwitchAddVipPaylod,
  type TwitchFollowPayload,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
  type TwitchTimerPayload,
} from '@fox-sphere/types';
import { onUnmounted, ref, watch } from 'vue';
import { useSound } from '../useSound';
import { useTimer } from '../useTimer';
import type { TwitchEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

export function useTwitchSocket(socketInstance: WidgetSocket) {
  const {
    currentStatus: currentEventType,
    clearActiveTimer,
    setStatusWithTimeout,
  } = useWidgetTimer<TwitchEventType>('idle');
  const { playSound } = useSound();
  const { timeDigits, timeLeft, startTimer, stopTimer } = useTimer();

  const addVip = ref<TwitchAddVipPaylod | null>(null);
  const follow = ref<TwitchFollowPayload | null>(null);
  const raid = ref<TwitchRaidPayload | null>(null);
  const reward = ref<TwitchRewardPayload | null>(null);
  const timer = ref<TwitchTimerPayload | null>(null);

  const handleAddVip = (data: TwitchAddVipPaylod) => {
    addVip.value = data;
    currentEventType.value = 'add-vip';
    playSound(SOUNDS.addVip);
    setStatusWithTimeout('add-vip', 5000);
  };

  const handleFollow = (data: TwitchFollowPayload) => {
    follow.value = data;
    currentEventType.value = 'follow';
    playSound(SOUNDS.follow);
    setStatusWithTimeout('follow', 5000);
  };

  const handleRaid = (data: TwitchRaidPayload) => {
    raid.value = data;
    currentEventType.value = 'raid';
    playSound(SOUNDS.raid);
    setStatusWithTimeout('raid', 5000);
  };

  const handleReward = (data: TwitchRewardPayload) => {
    reward.value = data;
    currentEventType.value = 'reward';
    playSound(SOUNDS.reward);
    setStatusWithTimeout('reward', 5000);
  };

  const handleTimer = (data: TwitchTimerPayload) => {
    timer.value = data;
    currentEventType.value = 'timer';
    startTimer(data.time);
  };

  watch(timeLeft, (newTimeLeft) => {
    if (newTimeLeft === 0 && currentEventType.value == 'timer') {
      playSound(SOUNDS.timer);
      currentEventType.value = 'idle';
    }
  });

  socketInstance.on('twitch:add-vip', handleAddVip);
  socketInstance.on('twitch:follow', handleFollow);
  socketInstance.on('twitch:raid', handleRaid);
  socketInstance.on('twitch:reward-redeem', handleReward);
  socketInstance.on('twitch:timer', handleTimer);

  onUnmounted(() => {
    clearActiveTimer();
    stopTimer();

    socketInstance.off('twitch:add-vip', handleAddVip);
    socketInstance.off('twitch:follow', handleFollow);
    socketInstance.off('twitch:raid', handleRaid);
    socketInstance.off('twitch:reward-redeem', handleReward);
    socketInstance.off('twitch:timer', handleTimer);
  });

  return {
    addVip,
    currentEventType,
    follow,
    raid,
    reward,
    timer,
    timeDigits,
  };
}
