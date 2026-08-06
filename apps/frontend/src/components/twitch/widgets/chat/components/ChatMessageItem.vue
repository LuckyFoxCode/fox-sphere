<script setup lang="ts">
import { TwitchEmote } from '@/components/ui';
import { parseTwitchEmotes } from '@/utils/twitch';
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{
  message: TwitchChatMessagePayload;
}>();

const tokens = computed(() => parseTwitchEmotes(props.message.text, props.message.emotes));
</script>

<template>
  <li
    class="bg-card/80 border-text-second/10 relative flex flex-col gap-1 rounded-r-xl border-2 border-l-4 p-2 text-sm shadow-sm backdrop-blur-md"
    :style="{ borderLeftColor: message.color }"
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
        :style="{ color: message.color }"
        class="truncate"
      >
        {{ message.displayName }}
      </span>
    </div>

    <p class="text-text-main leading-snug wrap-break-word">
      <template
        v-for="(token, index) in tokens"
        :key="index"
      >
        <span v-if="token.type === 'text'">{{ token.content }}</span>
        <TwitchEmote
          v-else
          :url="token.url"
          :name="token.name"
          :size="32"
        />
      </template>
    </p>
  </li>
</template>
