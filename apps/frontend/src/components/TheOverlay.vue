<script setup lang="ts">
import { LotteryManager } from './lottery';
import TwitchWidget from './twitch/TwitchWidget.vue';
</script>

<template>
  <div class="relative mx-auto flex h-270 w-480 items-center justify-center">
    <LotteryManager />
    <TwitchWidget />
  </div>
</template>
