<script setup lang="ts">
import { ROULETTE_WHEEL_COLORS, type RouletteWheelSegment } from '@/constants';
import { segmentCenterAngle } from '@/utils/roulette';
import { computed } from 'vue';

interface Props {
  segments: readonly RouletteWheelSegment[];
  rotation: number;
  durationMs: number;
}

const props = defineProps<Props>();

// Лампочки по раме — статичный марки-обвод, мерцает в противофазе.
const BULB_COUNT = 24;
const BULB_PULSE_MS = 1600;

// Тёмный текст нужен только на ярком cyan-секторе XP; emoji цвет не берут.
const lightSegmentIds = new Set<RouletteWheelSegment['id']>(['xp35']);

// Маркер категории у ступицы: монеты — золото, XP — cyan, джекпот — золото.
const markerColor: Partial<Record<RouletteWheelSegment['id'], string>> = {
  coins30: 'var(--color-event-amber)',
  coins60: 'var(--color-event-amber)',
  coins100: 'var(--color-event-amber)',
  coins250: 'var(--color-event-amber)',
  xp35: 'var(--color-event-cyan)',
  jackpot: 'var(--color-event-amber)',
};

const gradient = computed(() => {
  const step = 360 / props.segments.length;
  const stops = props.segments.map((segment, index) => {
    const from = index * step;
    const to = (index + 1) * step;
    return `${ROULETTE_WHEEL_COLORS[segment.id]} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
});

const labelClass = (segment: RouletteWheelSegment): string =>
  lightSegmentIds.has(segment.id) ? 'text-[#09090b]' : 'text-text-main';

const spokeStyle = (angle: number) => ({ transform: `rotate(${angle}deg)` });

const bulbStyle = (index: number) => ({
  animationDelay: `${index % 2 === 0 ? 0 : BULB_PULSE_MS / 2}ms`,
  animationDuration: `${BULB_PULSE_MS}ms`,
});
</script>

<template>
  <div
    class="relative size-100"
    role="img"
    aria-label="Колесо рулетки"
  >
    <!-- Статичная рама с металлическим отблеском -->
    <div
      class="border-line absolute inset-0 rounded-full border shadow-[0_0_60px_var(--color-event-purple),inset_0_0_18px_rgba(0,0,0,0.85)]"
    >
      <div
        class="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#232329,#1a1a1f,#232329,#1a1a1f,#232329,#1a1a1f,#232329)]"
      />
      <div class="absolute inset-0 rounded-full ring-1 ring-white/10" />
    </div>

    <!-- Марки-лампочки по раме -->
    <div
      v-for="i in BULB_COUNT"
      :key="`bulb-${i}`"
      class="pointer-events-none absolute inset-0"
      :style="spokeStyle(((i - 1) * 360) / BULB_COUNT)"
    >
      <span
        class="bulb absolute top-[1.8%] left-1/2 size-1.5 -translate-x-1/2 rounded-full"
        :class="
          i % 2 === 0
            ? 'bg-event-amber shadow-[0_0_7px_var(--color-event-amber)]'
            : 'bg-event-purple shadow-[0_0_7px_var(--color-event-purple)]'
        "
        :style="bulbStyle(i)"
      />
    </div>

    <!-- Вращающийся диск -->
    <div
      class="absolute inset-2.5 overflow-hidden rounded-full shadow-[inset_0_0_26px_rgba(0,0,0,0.6)] will-change-transform motion-reduce:transition-none"
      :style="{
        background: gradient,
        transform: `rotate(${rotation}deg)`,
        transitionProperty: 'transform',
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.12, 0.6, 0.08, 1)',
      }"
    >
      <!-- Радиальные разделители с пегами на границах секторов -->
      <div
        v-for="index in segments.length"
        :key="`spoke-${index}`"
        class="absolute inset-0"
        :style="spokeStyle(((index - 1) * 360) / segments.length)"
      >
        <div class="absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[#09090b]/45" />
        <div
          class="absolute top-[2.5%] left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#09090b]/60"
        />
      </div>

      <!-- Подписи — развёрнуты вдоль сектора: иконка у обода, текст к центру -->
      <div
        v-for="(segment, index) in segments"
        :key="`label-${index}`"
        class="absolute inset-0"
        :style="spokeStyle(segmentCenterAngle(index, segments.length))"
      >
        <span class="absolute top-[8%] left-1/2 -translate-x-1/2 text-lg leading-none">
          {{ segment.icon }}
        </span>

        <span
          v-if="segment.label"
          class="absolute top-[19%] left-1/2 -translate-x-1/2 text-sm font-extrabold [text-orientation:upright] [writing-mode:vertical-rl]"
          :class="labelClass(segment)"
        >
          {{ segment.label }}
        </span>

        <!-- Маркер категории у ступицы -->
        <span
          v-if="markerColor[segment.id]"
          class="absolute top-[46%] left-1/2 size-1.5 -translate-x-1/2 rounded-full"
          :style="{
            backgroundColor: markerColor[segment.id],
            boxShadow: `0 0 6px ${markerColor[segment.id]}`,
          }"
        />
      </div>
    </div>

    <!-- Виньетка к ободу + блик (статичные — свет не вращается с колесом) -->
    <div
      class="pointer-events-none absolute inset-2.5 rounded-full bg-[radial-gradient(circle,transparent_52%,rgba(0,0,0,0.4)_96%)]"
    />
    <div
      class="pointer-events-none absolute inset-2.5 rounded-full bg-[radial-gradient(ellipse_at_28%_16%,rgba(255,255,255,0.18),transparent_42%)]"
    />
    <div class="pointer-events-none absolute inset-2.5 rounded-full ring-1 ring-white/10" />

    <!-- Ступица -->
    <div class="absolute top-1/2 left-1/2 -translate-1/2">
      <div
        class="border-event-purple/60 flex size-14 items-center justify-center rounded-full border-2 bg-[#131316] shadow-[0_0_22px_var(--color-event-purple)]"
      >
        <div class="border-line size-8 rounded-full border bg-[#1d1d22]" />
        <div
          class="bg-event-purple absolute size-3 rounded-full shadow-[0_0_10px_var(--color-event-purple)]"
        />
      </div>
    </div>

    <!-- Стрелка-указатель сверху, остриём вниз в колесо — под ней читается подпись -->
    <div
      class="absolute -top-2 left-1/2 -translate-x-1/2 drop-shadow-[0_0_8px_var(--color-event-purple)]"
      aria-hidden="true"
    >
      <svg
        width="24"
        height="20"
        viewBox="0 0 24 20"
      >
        <path
          d="M12 20 L3 6 Q12 -3 21 6 Z"
          fill="currentColor"
          stroke="var(--color-event-purple)"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <circle
          cx="12"
          cy="7"
          r="2.4"
          fill="var(--color-event-purple)"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
@keyframes bulb-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.bulb {
  animation-name: bulb-pulse;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@media (prefers-reduced-motion: reduce) {
  .bulb {
    animation: none;
  }
}
</style>
