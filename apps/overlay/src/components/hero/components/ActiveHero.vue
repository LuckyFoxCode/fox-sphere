<script setup lang="ts">
import type { ActiveHero } from '@/composables';
import { LevelPill, TwitchEmote } from '@/components/ui';
import { getRankConfigByLevel } from '@/constants';
import { attachHeroLabel, removeHero, spawnHero } from '@/phaser/hero-lane';
import { parseTwitchEmotes } from '@/utils/twitch';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{ activeHero: ActiveHero }>();

const label = ref<HTMLElement | null>(null);
const generation = ref<number | null>(null);

const ROLE_CONFIG = [
  { check: (h: ActiveHero) => h.isBroadcaster, color: 'var(--color-event-amber)' },
  { check: (h: ActiveHero) => h.isSubscriber, color: 'var(--color-error)' },
  { check: (h: ActiveHero) => h.isFounder, color: 'var(--color-error)' },
  { check: (h: ActiveHero) => h.isVip, color: 'var(--color-event-rose)' },
  { check: (h: ActiveHero) => h.isMod, color: 'var(--color-success)' },
  { check: (h: ActiveHero) => h.isFollower, color: 'var(--color-event-purple)' },
] as const;

const roleBorderClass = computed(() => {
  const activeRole = ROLE_CONFIG.find((role) => role.check(props.activeHero));
  const borderColor = activeRole ? activeRole.color : 'var(--color-event-blue)';

  return `${borderColor}`;
});

const currentRank = computed(() =>
  getRankConfigByLevel(
    props.activeHero.userLvl,
    props.activeHero.isBroadcaster,
    props.activeHero.isBot,
  ),
);

const MAX_MESSAGE_CHARS = 48;

const bubbleTokens = computed(() => {
  const message = props.activeHero.message;
  if (!message) return [];

  const chars = Array.from(message);
  const truncated =
    chars.length > MAX_MESSAGE_CHARS ? `${chars.slice(0, MAX_MESSAGE_CHARS).join('')}…` : message;

  return parseTwitchEmotes(truncated, props.activeHero.messageEmotes ?? {});
});

onMounted(() => {
  generation.value = spawnHero(props.activeHero.userId, props.activeHero.heroId);

  if (label.value) {
    attachHeroLabel(props.activeHero.userId, label.value);
  }
});

onUnmounted(() => {
  if (generation.value === null) return;

  removeHero(props.activeHero.userId, generation.value);
});
</script>

<template>
  <div
    ref="label"
    class="fixed top-0 left-0 flex flex-col items-center will-change-transform"
  >
    <Transition name="bubble-fade">
      <div
        v-if="bubbleTokens.length"
        class="bg-text-main/80 text-bg absolute right-0 bottom-full left-1/2 z-10 mb-2 w-max max-w-57.5 min-w-14 -translate-x-1/2 rounded-xl px-1.5 py-1 text-center text-sm leading-snug wrap-break-word"
      >
        <template
          v-for="(token, index) in bubbleTokens"
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
        <div
          class="border-t-text-main/80 absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent"
        />
      </div>
    </Transition>
    <div
      class="bg-line/15 flex items-center gap-x-2 rounded-md border-r-2 px-2"
      :style="{ borderColor: `${roleBorderClass}` }"
    >
      <LevelPill
        v-if="!activeHero.isBot && !activeHero.isBroadcaster"
        :level="activeHero.userLvl"
      />
      <div class="flex h-full flex-col items-center justify-around leading-none">
        <span
          class="text-[16px] font-semibold tracking-wide whitespace-nowrap"
          :style="{ color: activeHero.userColor }"
        >
          {{ activeHero.userDisplayName }}
        </span>
        <span
          class="bg-linear-to-r from-[#FF8D28] via-[#B48155] to-[#FFCC00] bg-clip-text text-[14px] font-medium tracking-wide text-transparent uppercase"
          :style="{ backgroundImage: currentRank?.gradient }"
        >
          {{ currentRank?.rankTitle }}
        </span>
      </div>
    </div>
  </div>
</template>
