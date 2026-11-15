<script setup lang="ts">
import { paperFor } from '@/constants';
import type { WidgetVariant } from '@fox-sphere/types';
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  char: string;
  color: WidgetVariant;
}>();

/**
 * Переворот держится на одном числе: длительность прокрутки. Она уходит в CSS
 * переменной, а символ подменяется в её середине, когда тайл стоит ребром -
 * поэтому JS и анимация не могут разойтись. 260ms при тике раз в секунду -
 * тайл в движении 26% времени; на прежних 600ms секундный разряд не стоял на
 * месте почти никогда.
 */
const FLIP_MS = 260;
const SWAP_MS = FLIP_MS / 2;

const displayChar = ref(props.char);
const isFlipping = ref(false);
const paper = computed(() => paperFor(props.color));

let swapTimer: ReturnType<typeof setTimeout> | null = null;

const clearSwap = () => {
  if (swapTimer !== null) {
    clearTimeout(swapTimer);
    swapTimer = null;
  }
};

watch(
  () => props.char,
  (newVal) => {
    clearSwap();
    isFlipping.value = true;
    swapTimer = setTimeout(() => {
      displayChar.value = newVal;
      swapTimer = null;
    }, SWAP_MS);
  },
);

const onAnimationEnd = () => (isFlipping.value = false);

onUnmounted(clearSwap);
</script>

<template>
  <div
    class="relative inline-flex h-18.75 w-11 shrink-0 flex-col select-none perspective-near"
    :class="{ 'is-flipping': isFlipping }"
    :style="{ '--flip-ms': `${FLIP_MS}ms` }"
    @animationend="onAnimationEnd"
  >
    <div
      class="relative flex h-1/2 w-full justify-center overflow-hidden rounded-t-[9px]"
      :class="paper"
    >
      <span
        class="text-sticker-body absolute top-0 left-1/2 flex h-18.75 -translate-x-1/2 items-center text-5xl leading-none font-bold tabular-nums"
      >
        {{ displayChar }}
      </span>
    </div>

    <div
      class="relative flex h-1/2 w-full justify-center overflow-hidden rounded-b-[9px]"
      :class="paper"
    >
      <span
        class="text-sticker-body absolute bottom-0 left-1/2 flex h-18.75 -translate-x-1/2 items-center text-5xl leading-none font-bold tabular-nums"
      >
        {{ displayChar }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.is-flipping {
  animation: flip var(--flip-ms, 260ms) ease-in-out;
}

@keyframes flip {
  0% {
    transform: rotateX(0deg);
  }
  50% {
    transform: rotateX(-90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-flipping {
    animation: none;
  }
}
</style>
