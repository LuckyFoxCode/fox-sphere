<script setup lang="ts">
import { IconRank } from '@/assets/icons';
import type { ActivePokemon } from '@/composables';
import { computed } from 'vue';

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
      class="bg-line/60 flex gap-x-1 rounded-md border-b-2 py-0.5 pr-2 pl-0.5"
      :style="{ borderColor: `${roleBorderClass}` }"
    >
      <div class="relative flex size-10 items-center justify-center">
        <IconRank class="size-9" />
        <span class="text-text-main absolute top-1/2 left-1/2 -translate-1/2 text-sm font-medium">
          {{ activePokemon.userLvl }}
        </span>
      </div>
      <div class="flex flex-col items-center leading-none">
        <span
          class="text-base font-medium tracking-wide whitespace-nowrap"
          :style="{ color: activePokemon.userColor }"
        >
          {{ activePokemon.userDisplayName }}
        </span>
        <span
          class="bg-linear-to-r from-amber-400 to-yellow-400 bg-clip-text text-xs font-medium tracking-wider text-transparent uppercase"
          >newbie</span
        >
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
