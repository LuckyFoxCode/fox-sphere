<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import ChatMessageList from './components/ChatMessageList.vue';
defineProps<{ messages: TwitchChatMessagePayload[] }>();
</script>

<template>
  <div class="h-[70%] overflow-hidden">
    <ChatMessageList :messages="messages" />
  </div>
</template>
