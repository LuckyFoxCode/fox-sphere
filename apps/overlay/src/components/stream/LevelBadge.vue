<script setup lang="ts">
import { getRankConfigByLevel, RANK_RINGS } from '@/constants';
import { computed } from 'vue';

const props = defineProps<{ level: number }>();

const ring = computed(() => RANK_RINGS[Math.min(getRankConfigByLevel(props.level).tier, 9)]);
</script>

<template>
  <div class="text-text-main relative flex">
    <component
      :is="ring"
      class="size-16"
    />
    <span class="absolute top-1/2 left-1/2 -translate-1/2 text-lg">{{ level }}</span>
  </div>
</template>
