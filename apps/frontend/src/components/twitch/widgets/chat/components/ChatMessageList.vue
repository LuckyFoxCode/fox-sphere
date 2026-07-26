<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import ChatMessageItem from './ChatMessageItem.vue';

defineProps<{ messages: TwitchChatMessagePayload[] }>();
</script>

<template>
  <ul class="flex h-full flex-col justify-end gap-y-5 overflow-hidden p-1">
    <ChatMessageItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
    />
  </ul>
</template>
