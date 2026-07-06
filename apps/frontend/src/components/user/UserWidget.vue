<script setup lang="ts">
import { useUserSocker } from '@/composables';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { UserLevelUp } from './widgets';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');

const { currentEventType, levelUp, disconnect } = useUserSocker(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed top-[20%]">
    <Transition name="zoom-in">
      <UserLevelUp
        v-show="currentEventType === 'level-up'"
        :level-up
      />
    </Transition>
  </div>
</template>
