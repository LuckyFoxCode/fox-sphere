<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from './lottery';
import { PokemonWidget } from './pokemon';
import TheFooter from './TheFooter.vue';
import TheHeader from './TheHeader.vue';
import TheSidebar from './TheSidebar.vue';
import { TwitchWidget } from './twitch';
import { UserWidget } from './user';

onUnmounted(() => {
  socket.disconnect();
  socket.removeAllListeners();
});
</script>

<template>
  <div class="relative flex h-screen w-screen flex-col overflow-hidden">
    <TheHeader />
    <main class="flex w-full flex-1 justify-end">
      <LotteryManager />
      <PokemonWidget />
      <TwitchWidget />
      <UserWidget />
      <TheSidebar />
    </main>
    <TheFooter />
  </div>
</template>
