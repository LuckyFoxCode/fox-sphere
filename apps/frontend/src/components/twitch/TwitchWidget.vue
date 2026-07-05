<script setup lang="ts">
import { useTwitchSocket } from '@/composables';
import type { ClientToServerEvents, ServerToClientEvents } from '@fox-sphere/types';
import { io, Socket } from 'socket.io-client';
import { onUnmounted } from 'vue';
import { TwitchRewardRedeem } from './widgets';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');

const { isShowWidget, redeemData, disconnect } = useTwitchSocket(socket);

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="fixed bottom-[15%]">
    <Transition name="zoom-in">
      <TwitchRewardRedeem
        v-show="isShowWidget"
        :event-data="redeemData"
      />
    </Transition>
  </div>
</template>
