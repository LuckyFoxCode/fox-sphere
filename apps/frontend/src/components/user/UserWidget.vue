<script setup lang="ts">
import { useUserSocker } from '@/composables/sockets';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { UserLevelUp } from './widgets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = apiBaseUrl
  ? io(apiBaseUrl)
  : io();

const { currentEventType, levelUp, disconnect } = useUserSocker(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed top-[20%]">
    <Transition name="zoom-in">
      <UserLevelUp
        v-if="currentEventType === 'level-up' && levelUp"
        :level-up="levelUp"
      />
    </Transition>
  </div>
</template>
