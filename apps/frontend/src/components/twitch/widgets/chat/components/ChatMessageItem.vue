<script setup lang="ts">
import type { TwitchChatMessagePayload } from '@fox-sphere/types';

defineProps<{
  message: TwitchChatMessagePayload;
}>();
</script>

<template>
  <li
    class="bg-card/80 border-text-second/10 relative flex flex-col gap-1 rounded-r-xl border-2 border-l-4 p-2 text-sm shadow-sm backdrop-blur-md"
    :style="{ borderLeftColor: message.color || '#FF7F50' }"
  >
    <div class="flex items-center gap-1.5 font-semibold">
      <div
        v-if="message.badges?.length"
        class="flex shrink-0 items-center gap-0.5"
      >
        <img
          v-for="badge in message.badges"
          :key="badge"
          :src="badge"
          alt="badge"
          class="size-4 object-contain"
        />
      </div>

      <span
        :style="{ color: message.color || '#FF7F50' }"
        class="truncate"
      >
        {{ message.displayName }}
      </span>
    </div>

    <p class="text-text-main leading-snug wrap-break-word">
      {{ message.text }}
    </p>
  </li>
</template>
