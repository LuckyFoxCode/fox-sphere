<script setup lang="ts">
import { computed } from 'vue';
import DecorativeCap from './DecorativeCap.vue';

interface Props {
  type?: 'follow' | 'sub' | 'raid' | 'roulette' | 'default';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
});

const themeColors: Record<string, string> = {
  follow: '#00ffcc',
  sub: '#bf55ec',
  raid: '#ff4757',
  roulette: '#ffa502',
  default: '#3b82f6',
};

const frameColor = computed(() => themeColors[props.type] || themeColors.default);
</script>

<template>
  <div
    class="relative inline-block min-h-32 min-w-72 p-8 transition-all duration-300 ease-out"
    :style="{ '--widget-color': frameColor }"
  >
    <div
      class="animate-pulse-soft bg-bg/90 absolute inset-0 rounded-2xl border-2"
      style="
        border-color: var(--widget-color);
        box-shadow:
          0 0 1px var(--widget-color),
          inset 0 0 5px var(--color-bg, 0.8);
      "
    />

    <div class="absolute top-0 left-1/2 z-20 -translate-x-1/2">
      <DecorativeCap
        size="150px"
        direction="horizontal"
      />
    </div>

    <div class="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rotate-180">
      <DecorativeCap
        size="150px"
        direction="horizontal"
      />
    </div>

    <div class="absolute top-1/2 left-0 z-20 -translate-y-1/2">
      <DecorativeCap
        size="70px"
        direction="vertical"
      />
    </div>

    <div class="absolute top-1/2 right-0 z-20 -translate-y-1/2 rotate-180">
      <DecorativeCap
        size="70px"
        direction="vertical"
      />
    </div>

    <div
      class="bg-bg absolute top-3.5 left-3.5 z-20 h-1.5 w-1.5 rounded-full border border-slate-600 opacity-60"
    ></div>
    <div
      class="bg-bg absolute top-3.5 right-3.5 z-20 h-1.5 w-1.5 rounded-full border border-slate-600 opacity-60"
    ></div>
    <div
      class="bg-bg absolute bottom-3.5 left-3.5 z-20 h-1.5 w-1.5 rounded-full border border-slate-600 opacity-60"
    ></div>
    <div
      class="bg-bg absolute right-3.5 bottom-3.5 z-20 h-1.5 w-1.5 rounded-full border border-slate-600 opacity-60"
    ></div>

    <div class="text-text-main relative z-10 font-sans">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulseGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 2px var(--widget-color));
  }
  50% {
    filter: drop-shadow(0 0 8px var(--widget-color));
  }
}
.animate-pulse-soft {
  animation: pulseGlow 4s infinite ease-in-out;
}
</style>
