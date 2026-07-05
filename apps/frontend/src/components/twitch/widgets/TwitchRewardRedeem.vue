<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchRewardPayload } from '@fox-sphere/types';

const props = defineProps<{
  eventData: TwitchRewardPayload;
}>();
</script>

<template>
  <WidgetFrame variant="purple">
    <p class="text-text-main flex flex-wrap items-center justify-center gap-2 text-lg antialiased">
      <span class="text-event-purple text-2xl font-bold">{{ eventData.username }}</span>

      <span>activated</span>

      <span class="border-event-purple/70 bg-text-second/10 rounded-md border-2 px-2 py-0.5">
        <span class="text-event-amber font-semibold">
          {{ eventData.rewardTitle }}
        </span>
      </span>
    </p>
  </WidgetFrame>
</template>
