<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchTimerPayload } from '@fox-sphere/types';
defineProps<{ timer: TwitchTimerPayload }>();
</script>

<template>
  <div>
    <WidgetFrame
      :variant="timer.color"
      :is-shadow="false"
    >
      {{ timer }}
    </WidgetFrame>
  </div>
</template>
