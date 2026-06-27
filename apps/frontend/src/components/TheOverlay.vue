<script setup lang="ts">
import { io } from 'socket.io-client';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import LotteryAnnouncePanel from './lottery/widgets/LotteryAnnouncePanel.vue';

interface Winner {
  place: number;
  twitchId: string;
  username: string;
}
type BaseWinnerInfo = Omit<Winner, 'place'>;
type LotteryStatus = 'idle' | 'started' | 'drawer' | 'finished';

const winners = ref<Winner[]>([]);
const currentLotteryStatus = ref<LotteryStatus>('idle');
const winnersPoll = ref<BaseWinnerInfo[] | null>(null);
const lotteryDuration = ref<number | null>(null);

const winnersList = computed(() => winners.value);

const socket = io('http://localhost:3000');

onMounted(() => {
  socket.on('lottery:started', (payload) => {
    console.log('---DURATION---', payload);
    lotteryDuration.value = payload;
    currentLotteryStatus.value = 'started';
  });

  socket.on('lottery:winners', (data) => {
    winnersPoll.value = data.participants;
    console.log('---All winners pool---', data.participants);
  });

  socket.on('lottery:winner-drawn', (data) => {
    console.log('---WINNER---', data);
    currentLotteryStatus.value = 'drawer';

    winners.value.push(data);
  });

  socket.on('lottery:finished', (data) => {
    console.log(data);
    currentLotteryStatus.value = 'finished';
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
    opacity 0.5s,
    transform 0.5s;
}
.zoom-in-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.zoom-in-enter-to {
  opacity: 1;
  transform: scale(1);
}
</style>
