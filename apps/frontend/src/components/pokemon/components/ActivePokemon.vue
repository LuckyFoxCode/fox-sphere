<script setup lang="ts">
import type { ActivePokemon } from '@/composables';
import { computed } from 'vue';

const props = defineProps<{ activePokemon: ActivePokemon }>();

const ROLE_CONFIG = [
  { check: (p: ActivePokemon) => p.isSubscriber, color: 'var(--color-error)' },
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
    class="absolute bottom-0 flex flex-col items-center gap-y-1"
    :style="{
      left: `${activePokemon.currentX}vw`,
      transition: activePokemon.isWalking ? `left ${activePokemon.moveDuration}s linear` : 'none',
    }"
  >
    <div
      class="bg-line mb-1 flex gap-x-1 rounded-md border-l-4 px-2 py-1"
      :style="{ borderColor: `${roleBorderClass}` }"
    >
      <span
        class="bg-text-second/40 text-text-main flex size-5 items-center justify-center rounded-full text-xs"
        >{{ activePokemon.userLvl }}</span
      >
      <span
        class="text-sm whitespace-nowrap"
        :style="{ color: activePokemon.userColor }"
      >
        {{ activePokemon.username }}
      </span>
    </div>
    <img
      :src="activePokemon.spriteUrl"
      :alt="activePokemon.speciesName"
      class="h-16 w-auto object-contain [image-rendering:pixelated]"
      :class="{ 'scale-x-[-1]': activePokemon.isFlipped }"
    />
  </div>
</template>
