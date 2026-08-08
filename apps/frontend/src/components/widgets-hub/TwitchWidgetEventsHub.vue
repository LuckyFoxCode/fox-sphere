<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { PokemonWidget } from '../pokemon';
import { TwitchWidget } from '../twitch';
import { UserWidget } from '../user';

onUnmounted(() => {
  socket.disconnect();
  socket.removeAllListeners();
});
</script>

<template>
  <PokemonWidget />
  <TwitchWidget />
  <UserWidget />
</template>
