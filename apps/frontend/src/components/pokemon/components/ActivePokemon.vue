<script setup lang="ts">
import type { ActivePokemon } from '@/composables';

const props = defineProps<{ activePokemon: ActivePokemon }>();

console.log(props.activePokemon);
</script>

<template>
  <div
    class="absolute bottom-0 flex flex-col items-center gap-y-1"
    :style="{
      left: `${activePokemon.currentX}vw`,
      transition: activePokemon.isWalking ? `left ${activePokemon.moveDuration}s linear` : 'none',
    }"
  >
    <div class="bg-line border-success mb-1 flex gap-x-1 rounded-md border-l-4 px-2 py-1">
      <span
        class="bg-text-second/40 text-text-main flex size-5 items-center justify-center rounded-full text-xs"
        >3</span
      >
      <span class="text-event-red text-sm whitespace-nowrap">
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
