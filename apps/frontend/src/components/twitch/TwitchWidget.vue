<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
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
        v-if="currentEventType === 'reward' && reward"
        :reward="reward"
      />
    </Transition>
    <Transition name="zoom-in">
      <TwitchRaid
        v-if="currentEventType === 'raid' && raid"
        :raid="raid"
      />
    </Transition>
    <Transition name="zoom-in">
      <TwitchFollow
        v-if="currentEventType === 'follow' && follow"
        :follow="follow"
      />
    </Transition>
  </div>
</template>
