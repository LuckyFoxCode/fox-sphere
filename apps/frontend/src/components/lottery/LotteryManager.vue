<script setup lang="ts">
import { useLotterySocket } from '@/composables';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { LotteryAnnouncePanel, LotteryFinalSummary, LotteryWinnerReveal } from './widgets';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');
const { winner, winners, currentLotteryStatus, disconnect } = useLotterySocket(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed mx-auto flex h-270 w-480 items-center justify-center">
    <Transition name="zoom-in">
      <LotteryAnnouncePanel v-if="currentLotteryStatus === 'started'" />
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
        v-if="currentLotteryStatus === 'finished'"
        :winners
      />
    </Transition>
  </div>
</template>
