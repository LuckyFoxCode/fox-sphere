<script setup lang="ts">
import { io } from 'socket.io-client';
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface Winner {
  place: number;
  twitchId: string;
  username: string;
}
type BaseWinnerInfo = Omit<Winner, 'place'>;

const winners = ref<Winner[]>([]);
const lotteryPoll = ref<BaseWinnerInfo[] | null>(null);
const durationLottery = ref(null);

const winnersList = computed(() => winners.value);

const socket = io('http://localhost:3000');

onMounted(() => {
  socket.on('lottery:started', (data) => {
    console.log('---DURATION---', data);
    durationLottery.value = data;
  });

  socket.on('lottery:finished', (data) => {
    lotteryPoll.value = data.newWinners;
  });

  socket.on('lottery:winner-drawn', (data) => {
    console.log('---WINNER---', data);
    winners.value.push(data);
  });
});

onUnmounted(() => {
  socket.disconnect();
});
</script>

<template>
  <div>
    <p>Overlay</p>
    <div>
      winners:
      <ul>
        <li
          v-for="winner in winnersList"
          :key="winner.twitchId"
        >
          {{ winner.username }}
        </li>
      </ul>
    </div>
  </div>
</template>
