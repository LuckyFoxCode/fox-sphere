<script setup lang="ts">
import { RouletteTicker } from './roulette';
import { XpWidget } from './stream';
</script>

<template>
  <header class="from-card/90 flex w-full justify-end bg-linear-to-b to-transparent">
    <div class="flex items-center gap-x-3">
      <RouletteTicker />
      <XpWidget />
    </div>
  </header>
</template>
