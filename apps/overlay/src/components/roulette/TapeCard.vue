<script setup lang="ts">
import { RARITY_STYLES, SEGMENT_RARITY } from '@/constants';
import type { RouletteWheelSegment } from '@/constants';
import { computed } from 'vue';

const { segment, isWinner = false } = defineProps<{
  segment: RouletteWheelSegment;
  isWinner?: boolean;
}>();

const rarity = computed(() => RARITY_STYLES[SEGMENT_RARITY[segment.id]]);

const cardStyle = computed(() => ({
  borderColor: rarity.value.color,
  boxShadow: isWinner ? `0 0 ${rarity.value.glowSize}px ${rarity.value.glow}` : 'none',
}));
</script>

<template>
  <div
    class="border-line bg-card flex h-24 w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2"
    :class="isWinner ? 'scale-105' : ''"
    :style="cardStyle"
  >
    <span class="text-2xl leading-none">{{ segment.icon }}</span>
    <span
      v-if="segment.label"
      class="text-text-main text-sm font-extrabold"
    >
      {{ segment.label }}
    </span>
  </div>
</template>
