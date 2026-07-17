<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from './lottery';
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
  <div class="relative flex h-270 w-480 flex-col">
    <TheHeader />
    <main class="flex w-full flex-1 justify-end">
      <LotteryManager />
      <TwitchWidget />
      <UserWidget />
      <TheSidebar />
    </main>
  </div>
</template>
