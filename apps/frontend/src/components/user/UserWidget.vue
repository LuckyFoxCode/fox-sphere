<script setup lang="ts">
import { useUserSocker, type UserEventType } from '@/composables/sockets';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { computed, onUnmounted, type Component } from 'vue';
import { UserLevelUp } from './widgets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();

const { currentEventType, levelUp, disconnect } = useUserSocker(socket);

interface WidgetMapValue {
  component: Component;
  props?: Record<string, unknown>;
}

type ActiveLotteryEvent = Exclude<UserEventType, 'idle'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle') return null;

  const map: Record<ActiveLotteryEvent, WidgetMapValue> = {
    'level-up': { component: UserLevelUp, props: { levelUp: levelUp.value } },
  };

  return map[currentEventType.value as ActiveLotteryEvent] || null;
});

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed top-[20%]">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <component
        :is="widgetConfig?.component"
        v-if="widgetConfig"
        v-bind="widgetConfig.props"
      />
    </Transition>
  </div>
</template>
