import type {
  StreamLevelUpPayload,
  StreamXpBoostPayload,
  StreamXpUpdatePayload,
} from '@fox-sphere/types';
import { ref } from 'vue';
import type { StreamEventType, WidgetSocket } from './types';
import { useWidgetTimer } from './useWidgetTimer';

const { currentStatus: currentEventType, setStatusWithTimeout } =
  useWidgetTimer<StreamEventType>('level-up');

const level = ref(1);
const newXp = ref(0);
const maxXp = ref(0);
const startXp = ref(0);
const isLoading = ref(true);
const levelUp = ref<StreamLevelUpPayload | null>({ lvl: 2 });
const xpBoost = ref<StreamXpBoostPayload | null>(null);
const xpBoostTimeLeft = ref(0);

let boostInterval: ReturnType<typeof setInterval> | null = null;
let isSocketInitialized = false;

function startBoostCountdown(expiresAt: number) {
  xpBoostTimeLeft.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  if (boostInterval) clearInterval(boostInterval);

  boostInterval = setInterval(() => {
    xpBoostTimeLeft.value -= 1;

    if (xpBoostTimeLeft.value <= 0) {
      xpBoost.value = null;
      if (boostInterval) clearInterval(boostInterval);
      boostInterval = null;
    }
  }, 1000);
}

export function useStreamSocket(socketInstance: WidgetSocket) {
  const handleXpUpdate = (data: StreamXpUpdatePayload) => {
    level.value = data.lvl;
    newXp.value = data.newXp;
    maxXp.value = data.maxXp;
    startXp.value = data.startXp;

    if (currentEventType.value === 'idle') {
      currentEventType.value = 'xp-update';
    }
  };

  const handleLevelUp = (data: StreamLevelUpPayload) => {
    levelUp.value = data;
    currentEventType.value = 'level-up';
    setStatusWithTimeout('level-up', 8000);
  };

  const handleXpBoost = (data: StreamXpBoostPayload) => {
    xpBoost.value = data;
    startBoostCountdown(data.expiresAt);
  };

  const fetchInitialState = () => {
    socketInstance.emit('stream:get-system-state', {}, (response) => {
      level.value = response.lvl;
      newXp.value = response.newXp;
      maxXp.value = response.maxXp;
      startXp.value = response.startXp;
      isLoading.value = false;

      if (response.xpBoost && response.xpBoost.expiresAt !== null) {
        xpBoost.value = {
          multiplier: response.xpBoost.multiplier,
          expiresAt: response.xpBoost.expiresAt,
          source: 'auto',
        };
        startBoostCountdown(response.xpBoost.expiresAt);
      }
    });
  };

  if (!isSocketInitialized) {
    socketInstance.on('stream:xp-updated', handleXpUpdate);
    socketInstance.on('stream:level-up', handleLevelUp);
    socketInstance.on('stream:xp-boost', handleXpBoost);

    if (socketInstance.connected) {
      fetchInitialState();
    } else {
      socketInstance.on('connect', fetchInitialState);
    }

    isSocketInitialized = true;
  }

  return {
    level,
    newXp,
    maxXp,
    startXp,
    isLoading,
    levelUp,
    xpBoost,
    xpBoostTimeLeft,
    currentEventType,
  };
}
