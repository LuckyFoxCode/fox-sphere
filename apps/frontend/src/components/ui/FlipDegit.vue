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
    red: 'border-event-red/40 bg-event-red/5',
    cyan: 'border-event-cyan/40 bg-event-cyan/5',
    purple: 'border-event-purple/40 bg-event-purple/5',
    amber: 'border-event-amber/40 bg-event-amber/5',
    rose: 'border-event-rose/40 bg-event-rose/5',
    blue: 'border-event-blue/40 bg-event-rose/5',
  };

  return mapping[props.color] || 'border-purple-500/40 bg-purple-500/5';
});

const onAnimationEnd = () => (isFlipping.value = false);
</script>

<template>
  <div
    class="relative inline-flex h-16 w-11 flex-col text-5xl leading-none perspective-near"
    :class="{ 'is-flipping': isFlipping }"
    @animationend="onAnimationEnd"
  >
    <div
      :class="[
        `border-event-${color}/40 bg-event-${color}/5 relative flex h-1/2 w-full justify-center overflow-hidden rounded-t-lg border-x-2 border-t`,
        colorClasses,
      ]"
    >
      <span class="absolute -top-0.5 left-1/2 flex h-16 -translate-x-1/2 items-center">
        {{ displayChar }}
      </span>
    </div>

    <div
      :class="[
        `border-event-${color}/40 bg-event-${color}/5 relative flex h-1/2 w-full justify-center overflow-hidden rounded-b-md border-x-2 border-t border-b border-t-purple-500/10`,
        colorClasses,
      ]"
    >
      <span class="absolute -bottom-px left-1/2 flex h-16 -translate-x-1/2 items-center">
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
