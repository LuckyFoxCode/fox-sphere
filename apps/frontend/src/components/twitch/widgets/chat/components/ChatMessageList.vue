<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import ChatMessageItem from './ChatMessageItem.vue';

defineProps<{ messages: TwitchChatMessagePayload[] }>();
</script>

<template>
  <TransitionGroup
    tag="ul"
    name="chat-list"
    class="relative flex h-full flex-col justify-end gap-y-5 overflow-hidden p-1"
  >
    <ChatMessageItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
      class="chat-item"
    />
  </TransitionGroup>
</template>

<style scoped>
.chat-list-enter-from {
  opacity: 0;
  transform: translateY(100%) scale(0.9);
}

.chat-list-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.chat-list-move,
.chat-list-enter-active,
.chat-list-leave-active {
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-list-leave-active {
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
}
</style>
