<script setup lang="ts">
import { useLotterySocket } from '@/composables/sockets';
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
        v-if="currentLotteryStatus === 'ticket' && ticket"
        :ticket="ticket"
      />
    </Transition>
    <Transition name="zoom-in">
      <LotteryAnnouncePanel v-show="currentLotteryStatus === 'started'" />
    </Transition>
    <Transition name="zoom-in">
      <LotteryWinnerReveal
        v-if="currentLotteryStatus === 'drawer' && winner"
        :winner="winner"
      />
    </Transition>
    <Transition name="zoom-in">
      <LotteryFinalSummary
        v-if="currentLotteryStatus === 'finished'"
        :winners="winners"
      />
    </Transition>
  </div>
</template>
