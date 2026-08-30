<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  maxXp: number;
  newXp: number;
  progressPercentage: number;
}>();

const TOTAL_SEGMENTS = 40;

const activeSegmentsCount = computed(() => {
  return Math.floor((props.progressPercentage / 100) * TOTAL_SEGMENTS);
});

const getSegmentStyle = (index: number) => {
  const segmentRatio = (index - 1) / (TOTAL_SEGMENTS - 1);
  const intensity = 0.15 + 0.85 * segmentRatio;

  return {
    backgroundColor: 'var(--color-event-rose)',
    opacity: intensity,
    filter: 'drop-shadow(0 0 4px var(--color-event-rose))',
  };
};
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-y-1 pr-1.5">
    <div class="flex justify-between text-xs font-medium">
      <span class="text-text-main/75">{{ newXp }} / {{ maxXp }} XP</span>
      <span class="text-lime/90">{{ Math.floor(progressPercentage) }}%</span>
    </div>

    <div class="flex h-6 w-full items-center justify-between gap-0.5">
      <div
        v-for="index in TOTAL_SEGMENTS"
        :key="index"
        class="h-full flex-1 rounded-full transition-all duration-1000"
        :class="[
          index <= activeSegmentsCount ? 'scale-y-100' : 'bg-text-main/90 scale-y-90 opacity-30',
        ]"
        :style="index <= activeSegmentsCount ? getSegmentStyle(index) : undefined"
      />
    </div>
  </div>
</template>
