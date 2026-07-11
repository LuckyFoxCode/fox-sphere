<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { UserLevelUpPayload } from '@fox-sphere/types';

defineProps<{ levelUp: UserLevelUpPayload }>();
</script>

<template>
  <WidgetFrame variant="amber">
    <div class="flex flex-col items-center gap-y-5 py-2">
      <p class="text-xl">
        ⚡
        <span class="text-event-amber text-2xl font-semibold">{{ levelUp.username }}</span> leveled
        up to
        <span
          class="bg-event-purple/20 border-event-purple text-event-amber/85 rounded-md border-2 px-2 py-1 font-medium"
          >Level {{ levelUp.newLevel }}!</span
        >
        ⚡
      </p>
      <span class="text-text-main/75 text-lg">Look who's getting powerful! 🚀</span>
    </div>
  </WidgetFrame>
</template>
