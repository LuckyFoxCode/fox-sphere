<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from './lottery';
import TheSidebar from './TheSidebar.vue';
import { TwitchWidget } from './twitch';
import { UserWidget } from './user';

onUnmounted(() => {
  socket.disconnect();
  socket.removeAllListeners();
});
</script>

<template>
  <div class="relative mx-auto flex h-270 w-480 items-center justify-center">
    <LotteryManager />
    <TwitchWidget />
    <UserWidget />
    <TheSidebar />
  </div>
</template>
