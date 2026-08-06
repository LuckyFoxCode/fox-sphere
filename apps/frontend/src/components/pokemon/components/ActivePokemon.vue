<script setup lang="ts">
import { IconBot, IconRank, IconStar } from '@/assets/icons';
import type { ActivePokemon } from '@/composables';
import { computed } from 'vue';
import { getRankConfigByLevel } from '../constants';

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
</script>

<template>
  <div
    class="absolute bottom-0 flex h-full flex-col items-center justify-between"
    :style="{
      left: `${activePokemon.currentX}vw`,
      transition: activePokemon.isWalking ? `left ${activePokemon.moveDuration}s linear` : 'none',
    }"
  >
    <div
      class="bg-line/15 flex items-center gap-x-1 rounded-md border-x-2 pr-2 pl-1"
      :style="{ borderColor: `${roleBorderClass}` }"
    >
      <div class="relative flex size-9 items-center justify-center">
        <IconRank class="size-8" />
        <span class="text-text-main absolute top-1/2 left-1/2 -translate-1/2 text-sm font-medium">
          <IconStar
            v-if="activePokemon.isBroadcaster"
            class="size-5"
            :style="{ color: activePokemon.userColor }"
          />
          <IconBot
            v-else-if="activePokemon.isBot"
            class="text-event-purple size-5"
          />
          <span v-else>{{ activePokemon.userLvl }}</span>
        </span>
      </div>
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
    <img
      :src="activePokemon.spriteUrl"
      :alt="activePokemon.speciesName"
      class="h-16 w-auto object-contain [image-rendering:pixelated]"
      :class="{ 'scale-x-[-1]': activePokemon.isFlipped }"
    />
  </div>
</template>
