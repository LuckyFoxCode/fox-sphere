<script setup lang="ts">
import type { ActivePokemon } from '@/composables';

defineProps<{ activePokemon: ActivePokemon }>();
</script>

<template>
  <div
    class="absolute bottom-0 flex flex-col items-center gap-y-1"
    :style="{
      left: `${activePokemon.currentX}vw`,
      transition: activePokemon.isWalking ? `left ${activePokemon.moveDuration}s linear` : 'none',
    }"
  >
    <span class="bg-bg/70 mb-1 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap">
      {{ activePokemon.username }}
    </span>
    <img
      :src="activePokemon.spriteUrl"
      :alt="activePokemon.speciesName"
      class="size-12 transition-transform duration-300"
      :class="{ 'scale-x-[-1]': activePokemon.isFlipped }"
    />
  </div>
</template>
