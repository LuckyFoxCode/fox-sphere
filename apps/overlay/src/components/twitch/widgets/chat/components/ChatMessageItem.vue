<script setup lang="ts">
import { TwitchEmote } from '@/components/ui';
import {
  CHAT_ROLE_STYLES,
  getRankConfigByLevel,
  MAX_ICON_TIER,
  RANK_BADGES,
  resolveChatRole,
} from '@/constants';
import { getAnnounceStyle, parseTwitchEmotes } from '@/utils/twitch';
import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{
  message: TwitchChatMessagePayload;
}>();

const tokens = computed(() => parseTwitchEmotes(props.message.text, props.message.emotes));

/**
 * Титул и медаль берутся из одного конфига, поэтому не могут разойтись. Для стримера
 * `getRankConfigByLevel` отвечает `GAME MASTER`, для бота - `SYSTEM BOT`, для зрителя - титул
 * его уровня; флаги уже есть в payload, расширять `TwitchChatMessagePayload` не нужно.
 */
const rank = computed(() =>
  getRankConfigByLevel(props.message.userLvl, props.message.isBroadcaster, props.message.isBot),
);

const medal = computed(() => RANK_BADGES[Math.min(rank.value.tier, MAX_ICON_TIER)]);

const announceStyle = computed(() =>
  props.message.isAnnouncement ? getAnnounceStyle(props.message.announceColor ?? 'blue') : null,
);

const roleStyle = computed(() => CHAT_ROLE_STYLES[resolveChatRole(props.message)]);

const watchStreakSummary = computed(() => {
  const streak = props.message.watchStreak;
  if (!streak) return null;
  return `🔥 ${streak.value} streams in a row! +${streak.reward} channel points`;
});
</script>

<template>
  <li
    class="relative flex flex-col gap-1 rounded-xl border-2 text-sm"
    :class="roleStyle.frame"
  >
    <div
      class="rounded-lg border-2 bg-linear-to-r pt-10"
      :class="roleStyle.header"
    >
      <div class="absolute top-0 left-0 flex w-full items-center justify-between pr-2">
        <div>
          <component
            :is="medal"
            class="size-10 shrink-0"
          />
          <span class="drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">{{ rank.rankTitle }}</span>
        </div>
        <div class="flex items-center gap-x-2">
          <span
            v-if="message.isAnnouncement"
            class="rounded-full border-2 bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
            :style="{
              borderColor: announceStyle?.borderColor,
              color: announceStyle?.borderColor,
            }"
          >
            Announcement
          </span>
          <span
            v-if="message.isHighlight"
            class="rounded-full border-2 border-rose-500 bg-rose-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-300 uppercase"
          >
            Highlight
          </span>
          <span
            v-if="message.watchStreak"
            class="rounded-full border-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
            :style="{ borderColor: message.color, color: message.color }"
          >
            Watch Streak
          </span>
          <span
            class="rounded-lg border-2 px-1.5 py-0.5 text-[10px] font-medium uppercase"
            :class="roleStyle.chip"
            >{{ roleStyle.label }}</span
          >
        </div>
      </div>
      <div
        class="sh font-quicksand flex flex-col gap-y-1 rounded-lg bg-linear-to-r px-3 py-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
        :class="roleStyle.body"
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
            <span
              v-if="token.type === 'text'"
              class="font-medium"
              >{{ token.content }}</span
            >
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
