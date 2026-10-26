<script setup lang="ts">
import { socket } from '@/services';
import { onUnmounted } from 'vue';
import { LotteryManager } from '../lottery';
import { HeroWidget } from '../hero';
import { ProfileWidget } from '../profile';
import { RouletteSpin } from '../roulette';
import { ShopWidget } from '../shop';
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
  <HeroWidget />
  <ProfileWidget />
  <RouletteSpin />
  <ShopWidget />
  <StreamWidget />
  <TwitchWidget />
  <UserWidget />
</template>
