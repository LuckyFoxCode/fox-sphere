<script setup lang="ts">
import { TwitchEmote } from '@/components/ui';
import type { ActivePokemon } from '@/composables';
import { parseTwitchEmotes } from '@/utils/twitch';
import { computed } from 'vue';
import { getRankConfigByLevel, RANK_BADGES } from '@/constants';

const props = defineProps<{ activePokemon: ActivePokemon }>();

const ROLE_CONFIG = [
  { check: (p: ActivePokemon) => p.isBroadcaster, color: 'var(--color-event-amber)' },
  { check: (p: ActivePokemon) => p.isSubscriber, color: 'var(--color-error)' },
  { check: (p: ActivePokemon) => p.isFounder, color: 'var(--color-error)' },
  { check: (p: ActivePokemon) => p.isVip, color: 'var(--color-event-rose)' },
  { check: (p: ActivePokemon) => p.isMod, color: 'var(--color-success)' },
  { check: (p: ActivePokemon) => p.isFollower, color: 'var(--color-event-purple)' },
] as const;

const roleBorderClass = computed(() => {
  const activeRole = ROLE_CONFIG.find((role) => role.check(props.activePokemon));
  const borderColor = activeRole ? activeRole.color : 'var(--color-event-blue)';

  return `${borderColor}`;
});

const currentRank = computed(() =>
  getRankConfigByLevel(
    props.activePokemon.userLvl,
    props.activePokemon.isBroadcaster,
    props.activePokemon.isBot,
  ),
);

const currentIcon = computed(() => RANK_BADGES[Math.min(currentRank.value.tier, 9)]);

const MAX_MESSAGE_CHARS = 48;

const bubbleTokens = computed(() => {
  const message = props.activePokemon.message;
  if (!message) return [];

  const chars = Array.from(message);
  const truncated =
    chars.length > MAX_MESSAGE_CHARS ? `${chars.slice(0, MAX_MESSAGE_CHARS).join('')}…` : message;

  return parseTwitchEmotes(truncated, props.activePokemon.messageEmotes ?? {});
});
</script>

<template>
  <div
    class="fixed bottom-0 flex h-full -translate-x-1/2 flex-col items-center justify-between"
    :style="{
      left: `${activePokemon.currentX}vw`,
      transition: activePokemon.isWalking ? `left ${activePokemon.moveDuration}s linear` : 'none',
    }"
  >
    <div class="relative flex flex-col items-center">
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
        class="bg-line/15 flex items-center gap-x-0.5 rounded-md border-r-2 pr-2"
        :style="{ borderColor: `${roleBorderClass}` }"
      >
        <component
          :is="currentIcon"
          class="size-10"
        />
        <div class="flex h-full flex-col items-center justify-around leading-none">
          <span
            class="text-[16px] font-semibold tracking-wide whitespace-nowrap"
            :style="{ color: activePokemon.userColor }"
          >
            {{ activePokemon.userDisplayName }}
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
    <img
      :src="activePokemon.spriteUrl"
      :alt="activePokemon.speciesName"
      class="h-16 w-auto object-contain [image-rendering:pixelated]"
      :class="{ 'scale-x-[-1]': activePokemon.isFlipped }"
    />
  </div>
</template>
