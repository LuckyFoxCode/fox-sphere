<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { StreamLevelUpPayload } from '@fox-sphere/types';

defineProps<{
  levelUp: StreamLevelUpPayload;
}>();
</script>

<template>
  <WidgetFrame variant="rose">
    <div class="flex items-center gap-x-2 text-3xl">
      <span>STREAM LEVEL</span>
      <span class="text-event-rose">{{ levelUp.lvl }}</span>
    </div>
  </WidgetFrame>
</template>
