<script setup lang="ts">
import type { WidgetVariant } from '@fox-sphere/types';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  char: string;
  color: WidgetVariant;
}>();

const displayChar = ref(props.char);
const isFlipping = ref(false);

watch(
  () => props.char,
  (newVal) => {
    isFlipping.value = true;

    setTimeout(() => {
      displayChar.value = newVal;
    }, 300);
  },
);

const colorClasses = computed(() => {
  const mapping: Record<WidgetVariant, string> = {
    amber: 'border-event-amber/15',
    blue: 'border-event-blue/15',
    cyan: 'border-event-cyan/15',
    purple: 'border-event-purple/15',
    red: 'border-event-red/15',
    rose: 'border-event-rose/15',
  };

  return mapping[props.color] || 'border-purple-500/40 bg-purple-500/5';
});

const onAnimationEnd = () => (isFlipping.value = false);
</script>

<template>
  <div
    class="relative inline-flex h-18.75 w-11 flex-col text-5xl leading-none select-none perspective-near"
    :class="{ 'is-flipping': isFlipping }"
    @animationend="onAnimationEnd"
  >
    <div
      class="bg-bg absolute inset-0 rounded-lg border-2"
      :class="colorClasses"
    />

    <div class="relative flex h-1/2 w-full justify-center overflow-hidden">
      <span class="absolute top-0 left-1/2 flex h-18.75 -translate-x-1/2 items-center">
        {{ displayChar }}
      </span>
    </div>

    <div class="relative flex h-1/2 w-full justify-center overflow-hidden">
      <span class="absolute bottom-0 left-1/2 flex h-18.75 -translate-x-1/2 items-center">
        {{ displayChar }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.is-flipping {
  animation: flip 0.6s ease-in-out;
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
</style>
