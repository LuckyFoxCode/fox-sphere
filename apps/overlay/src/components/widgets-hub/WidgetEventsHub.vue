<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from '../lottery';
import { PokemonWidget } from '../pokemon';
import { RouletteSpin } from '../roulette';
import { StreamWidget } from '../stream';
import { TwitchWidget } from '../twitch';
import { UserWidget } from '../user';

onUnmounted(() => {
  socket.disconnect();
  socket.removeAllListeners();
});
</script>

<template>
  <LotteryManager />
  <PokemonWidget />
  <RouletteSpin />
  <StreamWidget />
  <TwitchWidget />
  <UserWidget />
</template>
