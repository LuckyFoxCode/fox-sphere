<script setup lang="ts">
import { TAPE_CARD_HEIGHT_PX, TAPE_CARD_WIDTH_PX } from '@/constants';
import { RARITY_STYLES, SEGMENT_RARITY } from '@/constants';
import type { RouletteWheelSegment } from '@/constants';
import { computed } from 'vue';

const { segment, isWinner = false } = defineProps<{
  segment: RouletteWheelSegment;
  isWinner?: boolean;
}>();

const rarity = computed(() => RARITY_STYLES[SEGMENT_RARITY[segment.id]]);

const cardStyle = computed(() => ({
  width: `${TAPE_CARD_WIDTH_PX}px`,
  height: `${TAPE_CARD_HEIGHT_PX}px`,
  backgroundColor: `color-mix(in oklab, ${rarity.value.color} 12%, transparent)`,
  borderColor: rarity.value.color,
  boxShadow: isWinner ? `0 0 ${rarity.value.glowSize}px ${rarity.value.glow}` : 'none',
}));
</script>

<template>
  <div
    class="border-line flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border-2"
    :class="isWinner ? 'scale-105' : ''"
    :style="cardStyle"
  >
    <span class="text-4xl leading-none">{{ segment.icon }}</span>
    <span
      v-if="segment.label"
      class="text-text-main text-lg font-extrabold"
    >
      {{ segment.label }}
    </span>
  </div>
</template>
