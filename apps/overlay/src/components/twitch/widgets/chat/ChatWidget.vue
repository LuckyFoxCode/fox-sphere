<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';

import ChatMessageList from './components/ChatMessageList.vue';

defineProps<{ messages: TwitchChatMessagePayload[] }>();
</script>

<template>
  <div
    class="flex h-181.25 flex-col gap-y-2 overflow-hidden rounded-2xl border-2 border-slate-600 bg-slate-700/30 pt-3"
  >
    <div class="flex items-center gap-x-2 px-3">
      <div class="relative size-4 rounded-full bg-rose-500">
        <div class="shadow_pulse absolute top-0 left-0 flex size-4 animate-pulse rounded-full" />
      </div>
      <span class="font-quicksand text-xl">Live chat</span>
    </div>
    <ChatMessageList :messages="messages" />
  </div>
</template>

<style>
.shadow_pulse {
  box-shadow: 0 0 8px 2px #f43f5e;
}
</style>
