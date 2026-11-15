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
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-y-1 pr-1.5">
    <div class="flex items-baseline justify-between text-sm font-semibold">
      <span class="text-sticker-muted tabular-nums">{{ newXp }} / {{ maxXp }} XP</span>
      <span class="text-sticker-mint tabular-nums">{{ Math.floor(progressPercentage) }}%</span>
    </div>

    <!-- Плоские ячейки, без свечения: ведёт одна мятная, остальные залиты розовым. -->
    <div class="flex h-2.5 w-full items-center gap-0.5">
      <div
        v-for="index in TOTAL_SEGMENTS"
        :key="index"
        class="h-full flex-1 rounded-xs transition-colors duration-700 ease-out"
        :class="
          index <= activeSegmentsCount
            ? index === activeSegmentsCount
              ? 'bg-sticker-mint'
              : 'bg-sticker-rose'
            : 'bg-sticker-track'
        "
      />
    </div>
  </div>
</template>
