<script setup lang="ts">
import type { RouletteWheelSegment } from '@/constants';
import {
  TAPE_CARD_GAP_PX,
  TAPE_CARD_WIDTH_PX,
  TAPE_VIEWPORT_WIDTH_PX,
  TAPE_WINNER_INDEX,
} from '@/constants';
import { computed, onMounted, ref } from 'vue';
import TapeCard from './TapeCard.vue';

const {
  segments,
  durationMs,
  reveal = false,
} = defineProps<{
  segments: readonly RouletteWheelSegment[];
  durationMs: number;
  reveal?: boolean;
}>();

// Цель: центр выигрышной карточки совпадает с центром вьюпорта.
// Шаг между карточками = ширина + зазор.
const cardStride = TAPE_CARD_WIDTH_PX + TAPE_CARD_GAP_PX;

const targetOffset = computed(
  () => -(TAPE_WINNER_INDEX * cardStride + TAPE_CARD_WIDTH_PX / 2 - TAPE_VIEWPORT_WIDTH_PX / 2),
);

const offset = ref(0);

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      offset.value = targetOffset.value;
    });
  });
});

const prefersReducedMotion = computed(
  () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);

const stripStyle = computed(() => {
  if (prefersReducedMotion.value) {
    return {
      gap: `${TAPE_CARD_GAP_PX}px`,
      transform: `translateX(${offset.value}px)`,
      transitionProperty: 'none',
      transitionDuration: '0ms',
    };
  }
  return {
    gap: `${TAPE_CARD_GAP_PX}px`,
    transform: `translateX(${offset.value}px)`,
    transitionProperty: 'transform',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.12, 0.6, 0.08, 1)',
  };
});

const isWinnerCard = (index: number): boolean => index === TAPE_WINNER_INDEX && reveal;
</script>

<template>
  <div
    class="border-line bg-card/40 relative overflow-hidden rounded-xl border"
    role="img"
    aria-label="Roulette tape"
    :style="{ width: `${TAPE_VIEWPORT_WIDTH_PX}px` }"
  >
    <!-- Центральный маркер: статичная линия под победителем -->
    <div
      class="border-event-amber/80 pointer-events-none absolute top-0 bottom-0 left-1/2 z-10 -translate-x-1/2 border-l-2"
    >
      <div
        class="bg-event-amber absolute -top-px left-1/2 h-3 w-6 -translate-x-1/2 rounded-b-md shadow-[0_0_8px_var(--color-event-amber)]"
      />
    </div>

    <!-- Затухание краёв — намёк на продолжение ленты -->
    <div
      class="from-bg/70 pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r to-transparent"
    />
    <div
      class="from-bg/70 pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l to-transparent"
    />

    <!-- Ряд карточек -->
    <div
      class="flex w-max py-3 will-change-transform motion-reduce:transition-none"
      :style="stripStyle"
    >
      <TapeCard
        v-for="(segment, index) in segments"
        :key="`tape-${index}`"
        :segment="segment"
        :is-winner="isWinnerCard(index)"
      />
    </div>
  </div>
</template>
