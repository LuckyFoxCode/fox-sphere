import { SOUNDS } from '@/constants/sound';
import {
  type TwitchAddVipPaylod,
  type TwitchFollowPayload,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
  type TwitchTimerPayload,
} from '@fox-sphere/types';
import { ref, watch } from 'vue';
import { useSound } from '../useSound';
import { useTimer } from '../useTimer';
import type { TwitchEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<TwitchEventType>('idle');
const { playSound } = useSound();
const { timeDigits, timeLeft, startTimer } = useTimer();

const isTimerActive = ref(false);

const addVip = ref<TwitchAddVipPaylod | null>(null);
const follow = ref<TwitchFollowPayload | null>(null);
const raid = ref<TwitchRaidPayload | null>(null);
const reward = ref<TwitchRewardPayload | null>(null);
const timer = ref<TwitchTimerPayload | null>(null);

let isSocketInitialized = false;

export function useTwitchSocket(socketInstance: WidgetSocket) {
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
    isTimerActive.value = true;
    startTimer(data.time);
  };

  if (!isSocketInitialized) {
    socketInstance.on('twitch:add-vip', handleAddVip);
    socketInstance.on('twitch:follow', handleFollow);
    socketInstance.on('twitch:raid', handleRaid);
    socketInstance.on('twitch:reward-redeem', handleReward);
    socketInstance.on('twitch:timer', handleTimer);

    watch(timeLeft, (newTimeLeft) => {
      if (newTimeLeft === 0 && isTimerActive.value) {
        playSound(SOUNDS.timer);
        isTimerActive.value = false;
      }
    });

    isSocketInitialized = true;
  }

  return {
    addVip,
    currentEventType,
    isTimerActive,
    follow,
    raid,
    reward,
    timer,
    timeDigits,
  };
}
