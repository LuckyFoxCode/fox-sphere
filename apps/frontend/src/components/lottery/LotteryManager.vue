<script setup lang="ts">
import { useLotterySocket, type LotteryStatus } from '@/composables/sockets';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { computed, onUnmounted, type Component } from 'vue';
import {
  LotteryAnnouncePanel,
  LotteryFinalSummary,
  LotteryTicket,
  LotteryWinnerReveal,
} from './widgets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();

const { ticket, winner, winners, currentLotteryStatus, disconnect } = useLotterySocket(socket);

interface WidgetMapValue {
  component: Component;
  props?: Record<string, unknown>;
}

type ActiveLotteryEvent = Exclude<LotteryStatus, 'idle'>;

const widgetConfig = computed(() => {
  if (currentLotteryStatus.value === 'idle') return null;

  const map: Record<ActiveLotteryEvent, WidgetMapValue> = {
    ticket: { component: LotteryTicket, props: { ticket: ticket.value } },
    started: { component: LotteryAnnouncePanel },
    drawer: { component: LotteryWinnerReveal, props: { winner: winner.value } },
    finished: { component: LotteryFinalSummary, props: { winners: winners.value } },
  };

  return map[currentLotteryStatus.value as ActiveLotteryEvent] || null;
});

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed top-1/2 left-1/2 -translate-1/2">
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
