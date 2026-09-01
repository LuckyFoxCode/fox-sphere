import { SOUNDS } from '@/constants/sound';
import {
  type TwitchAddVipPaylod,
  type TwitchChatMessagePayload,
  type TwitchFollowPayload,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
  type TwitchTimerPayload,
  type TwitchWatchStreakPayload,
} from '@fox-sphere/types';
import { ref, watch } from 'vue';
import { usePokemonOverlay } from '../usePokemonOverlay';
import { useSound } from '../useSound';
import { useTimer } from '../useTimer';
import type { TwitchEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<TwitchEventType>('idle');
const { playSound } = useSound();
const { timeDigits, timeLeft, startTimer, resetTimer } = useTimer();
const { activePokemons, handlePokemonMessage } = usePokemonOverlay();

const isTimerActive = ref(false);

const addVip = ref<TwitchAddVipPaylod | null>(null);
const follow = ref<TwitchFollowPayload | null>(null);
const raid = ref<TwitchRaidPayload | null>(null);
const reward = ref<TwitchRewardPayload | null>(null);
const timer = ref<TwitchTimerPayload | null>(null);
const messages = ref<TwitchChatMessagePayload[]>([]);
const watchStreak = ref<TwitchWatchStreakPayload | null>(null);

const MAX_MESSAGES = 8;
const MESSAGE_TTL = 18000;

let isSocketInitialized = false;

export function useTwitchSocket(socketInstance: WidgetSocket) {
  const handleChatMessage = (data: TwitchChatMessagePayload) => {
    messages.value.push(data);

    if (messages.value.length > MAX_MESSAGES) {
      messages.value.shift();
    }

    setTimeout(() => {
      removeMessage(data.id);
    }, MESSAGE_TTL);
  };

  const removeMessage = (id: string) => {
    const index = messages.value.findIndex((msg) => msg.id === id);

    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  };

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

  const handleTimerStop = () => {
    timer.value = null;
    resetTimer();
  };

  const handleWatchStreak = (data: TwitchWatchStreakPayload) => {
    watchStreak.value = data;
    playSound(SOUNDS.streak);
    setStatusWithTimeout('watch-streak', 7000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('chat:message', (data) => {
      handleChatMessage(data);
      handlePokemonMessage(data);
    });
    socketInstance.on('twitch:add-vip', handleAddVip);
    socketInstance.on('twitch:follow', handleFollow);
    socketInstance.on('twitch:raid', handleRaid);
    socketInstance.on('twitch:reward-redeem', handleReward);
    socketInstance.on('twitch:timer', handleTimer);
    socketInstance.on('twitch:timer-stop', handleTimerStop);
    socketInstance.on('twitch:watch-streak', handleWatchStreak);

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
    activePokemons,
    currentEventType,
    isTimerActive,
    follow,
    messages,
    raid,
    reward,
    timer,
    timeDigits,
    watchStreak,
  };
}
