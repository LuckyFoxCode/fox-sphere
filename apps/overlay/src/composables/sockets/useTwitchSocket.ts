import { SOUNDS } from '@/constants/sound';
import {
  type ActiveStreamTimer,
  type TwitchAddVipPaylod,
  type TwitchChatMessagePayload,
  type TwitchFollowPayload,
  type TwitchGoldenBeerPayload,
  type TwitchRaidPayload,
  type TwitchRewardPayload,
  type TwitchWatchStreakPayload,
} from '@fox-sphere/types';
import { ref, watch } from 'vue';
import { useHeroOverlay } from '../useHeroOverlay';
import { useSound } from '../useSound';
import { useTimer } from '../useTimer';
import type { TwitchEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<TwitchEventType>('idle');
const { playSound } = useSound();
const { timeDigits, timeLeft, startTimer, resetTimer } = useTimer();
const { activeHeroes, handleHeroMessage } = useHeroOverlay();

const isTimerActive = ref(false);

const addVip = ref<TwitchAddVipPaylod | null>(null);
const follow = ref<TwitchFollowPayload | null>(null);
const raid = ref<TwitchRaidPayload | null>(null);
const reward = ref<TwitchRewardPayload | null>(null);
const timer = ref<ActiveStreamTimer | null>(null);
const messages = ref<TwitchChatMessagePayload[]>([]);
const watchStreak = ref<TwitchWatchStreakPayload | null>(null);
const goldenBeer = ref<TwitchGoldenBeerPayload | null>(null);

const MAX_MESSAGES = 5;
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

  const handleTimer = (data: ActiveStreamTimer) => {
    timer.value = data;
    isTimerActive.value = true;
    startTimer(data.endsAt);
  };

  // `isTimerActive` снимается до `resetTimer`: тот обнуляет `timeLeft`, а на
  // ноль подписан звук окончания, поэтому `!stoptimer` иначе играл бы его как
  // доигравший таймер.
  const handleTimerStop = () => {
    timer.value = null;
    isTimerActive.value = false;
    resetTimer();
  };

  /**
   * Догоняет идущий таймер после загрузки страницы. Живое событие `twitch:timer`
   * несёт `endsAt` само, но перезагруженная сцена его уже пропустила — и без
   * этого запроса `!timer`, запущенный до открытия OBS, не появлялся вовсе.
   */
  const fetchTimer = () => {
    socketInstance.emit('twitch:get-timer', {}, (activeTimer) => {
      if (!activeTimer) {
        timer.value = null;
        isTimerActive.value = false;
        resetTimer();
        return;
      }

      timer.value = activeTimer;
      isTimerActive.value = true;
      startTimer(activeTimer.endsAt);
    });
  };

  const handleWatchStreak = (data: TwitchWatchStreakPayload) => {
    watchStreak.value = data;
    playSound(SOUNDS.streak);
    setStatusWithTimeout('watch-streak', 7000);
  };

  // Без `playSound`: звука пива в проекте нет, и событие по дизайну тихое.
  const handleGoldenBeer = (data: TwitchGoldenBeerPayload) => {
    goldenBeer.value = data;
    setStatusWithTimeout('golden-beer', 7000);
  };

  if (!isSocketInitialized) {
    socketInstance.on('chat:message', (data) => {
      handleChatMessage(data);
      handleHeroMessage(data);
    });
    socketInstance.on('twitch:add-vip', handleAddVip);
    socketInstance.on('twitch:follow', handleFollow);
    socketInstance.on('twitch:raid', handleRaid);
    socketInstance.on('twitch:reward-redeem', handleReward);
    socketInstance.on('twitch:timer', handleTimer);
    socketInstance.on('twitch:timer-stop', handleTimerStop);
    socketInstance.on('twitch:watch-streak', handleWatchStreak);
    socketInstance.on('twitch:golden-beer', handleGoldenBeer);

    if (socketInstance.connected) {
      fetchTimer();
    } else {
      socketInstance.on('connect', fetchTimer);
    }

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
    activeHeroes,
    currentEventType,
    isTimerActive,
    follow,
    goldenBeer,
    messages,
    raid,
    reward,
    timer,
    timeDigits,
    watchStreak,
  };
}
