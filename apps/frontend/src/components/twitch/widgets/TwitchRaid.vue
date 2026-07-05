<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchRaidPayload } from '@fox-sphere/types';

defineProps<{ raid: TwitchRaidPayload }>();
</script>

<template>
  <WidgetFrame variant="amber">
    <p class="text-xl">
      ⚡<span class="text-event-amber text-2xl font-bold">{{ raid.raiderName }}</span> just raided
      with
      <span class="text-event-amber/80 font-medium">{{ raid.viewers }} viewers!</span>
      Welcome to the Sphere! 🦊🌐✨
    </p>
  </WidgetFrame>
</template>
