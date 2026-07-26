<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';

defineProps<{
  message: TwitchChatMessagePayload;
}>();
</script>

<template>
  <li class="bg-text-main/70 relative rounded-xl px-1.5 pt-4">
    <div
      class="bg-bg/90 absolute -top-3 left-1.5 flex items-center gap-x-0.5 rounded-xl border-2 px-1.5 py-0.5 text-sm"
      :style="{ borderColor: message.color }"
    >
      <div class="flex items-center gap-x-0.5">
        <img
          :src="badge"
          alt="badge"
          v-for="badge in message.badges"
          :key="badge"
          class="size-4"
        />
      </div>
      <span :style="{ color: message.color }">{{ message.displayName }}</span>
    </div>
    <p class="text-bg/80 text-sm">
      {{ message.text }}
    </p>
  </li>
</template>
