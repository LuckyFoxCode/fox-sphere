<script setup lang="ts">
import { io } from 'socket.io-client';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { LotteryAnnouncePanel, LotteryFinalSummary, LotteryWinnerReveal } from './lottery/widgets';

interface Winner {
  place: number;
  twitchId: string;
  username: string;
}
type BaseWinnerInfo = Omit<Winner, 'place'>;
type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

const winners = ref<Winner[]>([]);
const winner = ref<Winner>({ place: 0, twitchId: '', username: '' });
const currentLotteryStatus = ref<LotteryStatus>('idle');
const winnersPoll = ref<BaseWinnerInfo[] | null>(null);
const lotteryDuration = ref<number | null>(null);
const timer = ref<ReturnType<typeof setTimeout> | null>(null);

const winnerData = computed(() => winner.value);

const socket = io('http://localhost:3000');

onMounted(() => {
  socket.on('lottery:started', (payload) => {
    if (timer.value) clearInterval(timer.value);

    lotteryDuration.value = payload;
    currentLotteryStatus.value = 'started';

    timer.value = setTimeout(() => {
      currentLotteryStatus.value = 'idle';
    }, 5000);
  });

  socket.on('lottery:winners', (data) => {
    winnersPoll.value = data.participants;
    console.log('---All winners pool---', data.participants);
  });

  socket.on('lottery:winner-drawn', (data) => {
    if (timer.value) clearInterval(timer.value);

    winner.value = data;
    currentLotteryStatus.value = 'drawer';

    timer.value = setTimeout(() => {
      currentLotteryStatus.value = 'idle';
    }, 4000);
    console.log('---DRAWN---', data);
  });

  socket.on('lottery:finished', (data) => {
    if (timer.value) clearInterval(timer.value);

    winners.value = data.winners;
    currentLotteryStatus.value = 'finished';

    timer.value = setTimeout(() => {
      currentLotteryStatus.value = 'idle';
    }, 5000);
    console.log('---local winners---', winners.value);
  });
});

onUnmounted(() => {
  socket.disconnect();
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
        :username="winnerData.username"
        :place="winnerData.place"
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
