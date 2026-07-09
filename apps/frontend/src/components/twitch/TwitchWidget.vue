<script setup lang="ts">
import { useTwitchSocket, type TwitchEventType } from '@/composables/sockets';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { computed, onUnmounted, type Component } from 'vue';
import { TwitchAddVip, TwitchFollow, TwitchRaid, TwitchRewardRedeem, TwitchTimer } from './widgets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();

const { addVip, currentEventType, follow, raid, reward, timer, disconnect } =
  useTwitchSocket(socket);

interface WidgetMapValue {
  component: Component;
  props: Record<string, unknown>;
}

type ActiveTwitchEvents = Exclude<TwitchEventType, 'idle'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle') return null;

  const map: Record<ActiveTwitchEvents, WidgetMapValue> = {
    'add-vip': { component: TwitchAddVip, props: { addVip: addVip.value } },
    reward: { component: TwitchRewardRedeem, props: { reward: reward.value } },
    raid: { component: TwitchRaid, props: { raid: raid.value } },
    follow: { component: TwitchFollow, props: { follow: follow.value } },
    timer: { component: TwitchTimer, props: { timer: timer.value } },
  };

  return map[currentEventType.value as ActiveTwitchEvents] || null;
});

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed bottom-[15%]">
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
