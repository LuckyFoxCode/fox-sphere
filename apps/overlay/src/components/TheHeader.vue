<script setup lang="ts">
import { RouletteTicker } from './roulette';
import { XpWidget } from './stream';
</script>

<template>
  <header class="flex w-full justify-end">
    <div class="flex items-center gap-x-2 pt-2 pr-3">
      <RouletteTicker />
      <XpWidget />
    </div>
  </header>
</template>
