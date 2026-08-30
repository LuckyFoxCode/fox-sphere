<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { StreamLevelUpPayload } from '@fox-sphere/types';

defineProps<{
  levelUp: StreamLevelUpPayload;
}>();
</script>

<template>
  <WidgetFrame variant="rose">
    <div class="flex flex-col items-center justify-center p-4 text-center">
      <span
        class="text-text-main/70 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase"
      >
        🔥 Stream Boost
      </span>
      <h2
        class="text-event-rose my-1 text-3xl font-black tracking-tight drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]"
      >
        LEVEL {{ levelUp.lvl }}
      </h2>
      <p class="text-text-second flex items-center gap-1.5 text-sm">
        🚀 <span>Next goal:</span>
        <strong class="text-text-main">Level {{ levelUp.lvl + 1 }}</strong>
      </p>
    </div>
  </WidgetFrame>
</template>
