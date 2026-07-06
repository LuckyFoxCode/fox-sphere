<script setup lang="ts">
import { useLotterySocket } from '@/composables';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { onUnmounted } from 'vue';
import {
  LotteryAnnouncePanel,
  LotteryFinalSummary,
  LotteryTicket,
  LotteryWinnerReveal,
} from './widgets';

// Пусто (VITE_API_BASE_URL не задан) → same-origin: overlay и Socket.io за одним
// Caddy. Задан (Cloudflare Pages) → абсолютный URL бэкенда.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();
const { ticket, winner, winners, currentLotteryStatus, disconnect } = useLotterySocket(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed mx-auto flex h-270 w-480 items-center justify-center">
    <Transition name="zoom-in">
      <LotteryTicket
        v-show="currentLotteryStatus === 'ticket'"
        :ticket
      />
    </Transition>
    <Transition name="zoom-in">
      <LotteryAnnouncePanel v-show="currentLotteryStatus === 'started'" />
    </Transition>
    <Transition name="zoom-in">
      <LotteryWinnerReveal
        v-show="currentLotteryStatus === 'drawer'"
        :username="winner.username"
        :place="winner.place"
      />
    </Transition>
    <Transition name="zoom-in">
      <LotteryFinalSummary
        v-show="currentLotteryStatus === 'finished'"
        :winners
      />
    </Transition>
  </div>
</template>
