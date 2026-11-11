<script setup lang="ts">
import { TwitchEmote } from '@/components/ui';
import { getRankConfigByLevel, MAX_ICON_TIER, RANK_BADGES } from '@/constants';
import { getAnnounceStyle, parseTwitchEmotes } from '@/utils/twitch';
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{
  message: TwitchChatMessagePayload;
}>();

const tokens = computed(() => parseTwitchEmotes(props.message.text, props.message.emotes));

const medal = computed(
  () =>
    RANK_BADGES[
      Math.min(
        getRankConfigByLevel(
          props.message.userLvl,
          props.message.isBroadcaster,
          props.message.isBot,
        ).tier,
        MAX_ICON_TIER,
      )
    ],
);

const announceStyle = computed(() =>
  props.message.isAnnouncement ? getAnnounceStyle(props.message.announceColor ?? 'blue') : null,
);

const watchStreakSummary = computed(() => {
  const streak = props.message.watchStreak;
  if (!streak) return null;
  return `🔥 ${streak.value} streams in a row! +${streak.reward} channel points`;
});

const liStyle = computed(() => {
  const accent =
    props.message.watchStreak || props.message.isHighlight
      ? { borderColor: props.message.color, borderLeftColor: props.message.color }
      : { borderLeftColor: props.message.color };

  const announce = announceStyle.value
    ? {
        borderColor: announceStyle.value.borderColor,
        backgroundImage: `linear-gradient(${announceStyle.value.tint}, ${announceStyle.value.tint})`,
      }
    : accent;

  return {
    boxShadow: `0 0 5px color-mix(in srgb, ${props.message.color} 55%, transparent)`,
    ...announce,
  };
});
</script>

<template>
  <li class="relative flex flex-col gap-1 rounded-xl border-2 border-cyan-500 text-sm">
    <div
      class="rounded-lg border-2 border-slate-800 bg-linear-to-r from-cyan-400/80 to-cyan-700 pt-10"
    >
      <div class="absolute top-0 left-0 flex w-full items-center justify-between pr-2">
        <div>
          <component
            :is="medal"
            class="size-10 shrink-0"
          />
          <span>GAME MASTER</span>
        </div>
        <div class="flex items-center gap-x-2">
          <span
            class="rounded-lg border-2 border-cyan-400 bg-cyan-800 px-1.5 py-0.5 text-[10px] font-medium uppercase"
            >viewer</span
          >
        </div>
      </div>
      <div
        class="sh flex flex-col gap-y-1 rounded-lg bg-linear-to-r from-cyan-50 to-cyan-200 px-3 py-2"
      >
        <div class="flex items-center gap-1 font-semibold">
          <div
            v-if="message.badges?.length"
            class="flex shrink-0 items-center gap-0.5"
          >
            <img
              v-for="badge in message.badges"
              :key="badge"
              :src="badge"
              alt="badge"
              class="size-5 object-contain"
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
            class="truncate text-base"
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
          class="text-bg leading-snug wrap-break-word"
          :class="{ 'text-base italic opacity-80': message.watchStreak, italic: message.isAction }"
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
              :size="36"
            />
          </template>
        </p>
      </div>
    </div>
  </li>
</template>
<style scoped>
.sh {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}
</style>
