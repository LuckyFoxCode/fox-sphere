<script setup lang="ts">
import { IconLightning } from '@/assets/icons';
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchWatchStreakPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ watchStreak: TwitchWatchStreakPayload }>();

function getWatchStreakMessage(streak: number): string {
  if (streak === 3) return '🔥 3 streams in a row — the fire ignites!';
  if (streak === 5) return '⚡ 5 streams — streak machine!';
  if (streak === 7) return '💥 7 streams — unstoppable!';

  if (streak % 10 === 0) return `👑 MASSIVE JUBILEE! x${streak} streams in a row!`;
  if (streak % 5 === 0) return `🏆 ROUND NUMBER! x${streak} streams in a row!`;

  return `🔥 Solid streak x${streak}!`;
}

const streakText = computed(() => getWatchStreakMessage(props.watchStreak.streakValue));
</script>

<template>
  <WidgetFrame
    variant="rose"
    position-x="100"
  >
    <div class="flex flex-col items-center justify-center px-4 py-2 text-center">
      <span
        class="text-event-rose mb-4 flex items-center gap-1.5 text-xs font-medium tracking-[0.35em] uppercase"
      >
        <IconLightning class="size-4" />
        Stream Streak
      </span>

      <div class="mb-3 flex items-end justify-center gap-2">
        <span
          class="text-event-amber text-7xl leading-none font-semibold drop-shadow-[0_0_7px_var(--color-event-amber)]"
        >
          {{ watchStreak.streakValue }}
        </span>
      </div>

      <p class="text-text-main/80 mb-4 text-base font-medium">
        {{ streakText }}
      </p>

      <span
        class="text-event-amber mb-2 text-lg font-semibold drop-shadow-[0_0_5px_var(--color-event-amber)]"
      >
        {{ watchStreak.displayName }}
      </span>

      <div
        v-if="!watchStreak.isRepeat"
        class="flex items-center gap-2"
      >
        <span
          class="bg-event-blue/10 border-event-blue/80 text-event-amber rounded-full border px-2.5 py-0.5 text-sm font-semibold"
        >
          +{{ watchStreak.xpAwarded }} XP
        </span>
        <span
          class="bg-event-blue/10 border-event-blue/80 text-event-amber rounded-full border px-2.5 py-0.5 text-sm font-semibold"
        >
          🪙 +{{ watchStreak.coinsAwarded }}
        </span>
      </div>
    </div>
  </WidgetFrame>
</template>
