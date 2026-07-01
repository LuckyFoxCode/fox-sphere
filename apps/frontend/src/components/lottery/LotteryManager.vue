<script setup lang="ts">
import { useLotterySocket } from '@/composables';
import { io } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { LotteryAnnouncePanel, LotteryFinalSummary, LotteryWinnerReveal } from './widgets';

const socket = io('http://localhost:3000');
const { winner, winners, currentLotteryStatus, disconnect } = useLotterySocket(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="mx-auto flex h-270 w-480 items-center justify-center">
    <Transition name="slow-down">
      <LotteryAnnouncePanel v-if="currentLotteryStatus === 'started'" />
    </Transition>
    <Transition name="zoom-in">
      <LotteryWinnerReveal
        v-show="currentLotteryStatus === 'drawer'"
        :username="winner.username"
        :place="winner.place"
      />
    </Transition>
    <Transition name="slow-down">
      <LotteryFinalSummary
        :winners
        v-if="currentLotteryStatus === 'finished'"
      />
    </Transition>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.5s;
}
.slide-down-enter-from {
  transform: translateY(-20px);
}
.slide-down-enter-to {
  transform: translateY(0);
}

.zoom-in-enter-active,
.zoom-in-leave-active {
  transition:
    opacity 0.7s,
    transform 0.7s ease-in-out;
}
.zoom-in-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.zoom-in-enter-to {
  opacity: 1;
  transform: scale(1);
}
.zoom-in-leave-from {
  opacity: 1;
  transform: scale(1);
}
.zoom-in-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
