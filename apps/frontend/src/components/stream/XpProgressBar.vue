<script setup lang="ts">
import { WIDGET_VARIANTS } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{
  maxXp: number;
  newXp: number;
  progressPercentage: number;
}>();

const TOTAL_SEGMENTS = 50;

const activeSegmentsCount = computed(() => {
  return Math.floor((props.progressPercentage / 100) * TOTAL_SEGMENTS);
});

const getSegmentStyle = (index: number) => {
  const segmentRatio = (index - 1) / TOTAL_SEGMENTS;

  const colorIndex = Math.min(
    Math.floor(segmentRatio * WIDGET_VARIANTS.length),
    WIDGET_VARIANTS.length - 1,
  );

  const variantName = WIDGET_VARIANTS[colorIndex];
  const cssVar = `--color-event-${variantName}`;

  return {
    backgroundColor: `var(${cssVar})`,
    filter: `drop-shadow(0 0 5px var(${cssVar}))`,
  };
};
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-y-1">
    <div class="flex justify-between text-xs font-medium">
      <span class="text-text-main/70">{{ newXp }} / {{ maxXp }} XP</span>
      <span class="text-lime">{{ Math.floor(progressPercentage) }}%</span>
    </div>

    <div class="flex h-6 w-full items-center justify-between gap-0.5">
      <div
        v-for="index in TOTAL_SEGMENTS"
        :key="index"
        class="h-full flex-1 rounded-full transition-all duration-1000"
        :class="[
          index <= activeSegmentsCount
            ? 'scale-y-100 opacity-100'
            : 'scale-y-90 bg-white/10 opacity-30',
        ]"
        :style="index <= activeSegmentsCount ? getSegmentStyle(index) : undefined"
      />
    </div>
  </div>
</template>
