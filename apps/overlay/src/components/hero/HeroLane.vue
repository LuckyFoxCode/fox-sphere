<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { ActiveHero } from './components';

const { activeHeroes } = useTwitchSocket(socket);
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <TransitionGroup name="hero-fade">
      <ActiveHero
        v-for="[userId, hero] in activeHeroes"
        :key="userId"
        :active-hero="hero"
      />
    </TransitionGroup>
  </div>
</template>
