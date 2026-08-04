<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { ActivePokemon } from './components';

const { activePokemons } = useTwitchSocket(socket);
</script>

<template>
  <div class="pointer-events-none fixed right-0 bottom-0 left-0 h-full">
    <TransitionGroup name="zoom-in">
      <ActivePokemon
        v-for="[userId, pokemon] in activePokemons"
        :key="userId"
        :active-pokemon="pokemon"
      />
    </TransitionGroup>
  </div>
</template>
