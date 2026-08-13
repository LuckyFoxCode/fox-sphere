<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from '../lottery';
import { PokemonWidget } from '../pokemon';
import { TwitchWidget } from '../twitch';
import { UserWidget } from '../user';
import { StreamWidget } from '../stream';

onUnmounted(() => {
  socket.disconnect();
  socket.removeAllListeners();
});
</script>

<template>
  <LotteryManager />
  <PokemonWidget />
  <StreamWidget />
  <TwitchWidget />
  <UserWidget />
</template>
