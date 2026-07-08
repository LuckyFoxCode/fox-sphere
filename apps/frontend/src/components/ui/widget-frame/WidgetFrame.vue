<script setup lang="ts">
import { computed } from 'vue';
import DecorativeCap from './DecorativeCap.vue';

interface Props {
  variant?: 'cyan' | 'purple' | 'red' | 'amber' | 'blue' | 'rose';
  positionY?: string;
  positionX?: string;
  isShadow?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'blue',
  positionY: '150',
  positionX: '60',
  isShadow: true,
});

const themeColors: Record<NonNullable<Props['variant']>, string> = {
  cyan: 'var(--twitch-cyan)',
  purple: 'var(--twitch-purple)',
  red: 'var(--twitch-red)',
  amber: 'var(--twitch-amber)',
  blue: 'var(--twitch-blue)',
  rose: 'var(--twitch-rose)',
};

const frameColor = computed(() => themeColors[props.variant] || themeColors.blue);

const capsConfig = [
  { direction: 'top', size: `${props.positionY}px`, classes: 'top-0 left-1/2 -translate-x-1/2 ' },
  {
    direction: 'bottom',
    size: `${props.positionY}px`,
    classes: 'bottom-0 left-1/2 -translate-x-1/2',
  },
  { direction: 'left', size: `${props.positionX}px`, classes: 'top-1/2 left-0 -translate-y-1/2 ' },
  {
    direction: 'right',
    size: `${props.positionX}px`,
    classes: 'top-1/2 right-0 -translate-y-1/2 ',
  },
] as const;

const boltPositions = [
  'top-3.5 left-3.5',
  'top-3.5 right-3.5',
  'bottom-3.5 left-3.5',
  'right-3.5 bottom-3.5',
];
</script>

<template>
  <div
    class="relative flex min-h-32 min-w-72 items-center justify-center p-8 transition-all duration-300 ease-out"
    :style="{ '--widget-color': frameColor }"
  >
    <div
      :class="[isShadow && 'animate-pulse-soft', 'bg-bg/90 absolute inset-0 rounded-2xl border-2']"
      style="
        border-color: var(--widget-color);
        box-shadow:
          0 0 2px var(--widget-color),
          inset 0 0 10px var(--color-card, 0.6);
      "
    />
    <div
      :class="[
        isShadow ? 'bg-(--widget-color)/1' : 'bg-(--widget-color)/10',
        'border-bg/70 absolute inset-1 z-10 w-[calc(100%-8px)] rounded-2xl border-6',
      ]"
    />

    <div
      v-for="cap in capsConfig"
      :key="cap.direction"
      class="absolute z-20"
      :class="cap.classes"
    >
      <DecorativeCap
        :size="cap.size"
        :direction="cap.direction"
      />
    </div>

    <div
      v-for="(position, index) in boltPositions"
      :key="index"
      class="bg-card absolute z-20 h-1.5 w-1.5 rounded-full border border-(--widget-color) opacity-80"
      :class="position"
    />

    <div class="text-text-main relative z-10">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulseGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 3px var(--widget-color));
  }
  50% {
    filter: drop-shadow(0 0 12px var(--widget-color));
  }
}
.animate-pulse-soft {
  animation: pulseGlow 3s infinite ease-in-out;
}
</style>
