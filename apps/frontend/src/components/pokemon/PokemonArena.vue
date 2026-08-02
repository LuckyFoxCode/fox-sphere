<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';

const { activePokemons } = useTwitchSocket(socket);
</script>

<template>
  <div class="pointer-events-none fixed right-0 bottom-0 left-0 h-full overflow-hidden">
    <TransitionGroup name="zoom-in">
      <div
        class="absolute bottom-0 flex flex-col items-center gap-y-1"
        v-for="[userId, pokemon] in activePokemons"
        :key="userId"
        :style="{
          left: `${pokemon.currentX}vw`,
          transition: `left ${pokemon.moveDuration}s ease-in-out`,
        }"
      >
        <span class="bg-bg/70 mb-1 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap">
          {{ pokemon.username }}
        </span>
        <img
          :src="pokemon.spriteUrl"
          :alt="pokemon.speciesName"
          class="size-12 transition-transform duration-300"
          :class="{ 'scale-x-[-1]': pokemon.isFlipped }"
        />
      </div>
    </TransitionGroup>
  </div>
</template>
