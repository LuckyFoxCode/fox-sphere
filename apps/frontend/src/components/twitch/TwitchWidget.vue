<script setup lang="ts">
import { useTwitchSocket } from '@/composables';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { TwitchFollow, TwitchRaid, TwitchRewardRedeem } from './widgets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();

const { currentEventType, follow, raid, reward, disconnect } = useTwitchSocket(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed bottom-[15%]">
    <Transition name="zoom-in">
      <TwitchRewardRedeem
        v-show="currentEventType === 'reward'"
        :reward
      />
    </Transition>
    <Transition name="zoom-in">
      <TwitchRaid
        v-show="currentEventType === 'raid'"
        :raid
      />
    </Transition>
    <Transition name="zoom-in">
      <TwitchFollow
        :follow
        v-show="currentEventType === 'follow'"
      />
    </Transition>
  </div>
</template>
