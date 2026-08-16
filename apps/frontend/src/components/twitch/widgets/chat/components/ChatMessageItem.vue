<script setup lang="ts">
import { TwitchEmote } from '@/components/ui';
import { getAnnounceStyle, parseTwitchEmotes } from '@/utils/twitch';
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{
  message: TwitchChatMessagePayload;
}>();

const tokens = computed(() => parseTwitchEmotes(props.message.text, props.message.emotes));

const announceStyle = computed(() =>
  props.message.isAnnouncement ? getAnnounceStyle(props.message.announceColor ?? 'blue') : null,
);

const watchStreakSummary = computed(() => {
  const streak = props.message.watchStreak;
  if (!streak) return null;
  return `🔥 ${streak.value} streams in a row! +${streak.reward} channel points`;
});
</script>

<template>
  <li
    class="bg-card/80 border-text-second/10 relative flex flex-col gap-1 rounded-r-xl border-2 border-l-4 p-2 text-sm shadow-sm backdrop-blur-md"
    :style="
      announceStyle
        ? { borderColor: announceStyle.borderColor, backgroundColor: announceStyle.backgroundColor }
        : message.watchStreak || message.isHighlight
          ? { borderColor: message.color, borderLeftColor: message.color }
          : { borderLeftColor: message.color }
    "
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
        v-if="message.isAnnouncement"
        class="rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
        :style="{ borderColor: announceStyle?.borderColor, color: announceStyle?.borderColor }"
      >
        Announcement
      </span>
      <span
        v-if="message.watchStreak"
        class="rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
        :style="{ borderColor: message.color, color: message.color }"
      >
        Watch Streak
      </span>

      <span
        :style="{ color: message.color }"
        class="truncate"
      >
        {{ message.displayName }}
      </span>
    </div>

    <p
      v-if="watchStreakSummary"
      class="text-text-main text-sm leading-snug font-medium"
    >
      {{ watchStreakSummary }}
    </p>

    <p
      v-if="message.text"
      class="text-text-main leading-snug wrap-break-word"
      :class="{ 'text-sm italic opacity-80': message.watchStreak }"
    >
      <span v-if="message.watchStreak">💬&nbsp;</span>
      <template
        v-for="(token, index) in tokens"
        :key="index"
      >
        <span v-if="token.type === 'text'">{{ token.content }}</span>
        <span
          v-else-if="token.type === 'link'"
          class="text-link"
          >{{ token.content }}</span
        >
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
