<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchFollowPayload } from '@fox-sphere/types';

defineProps<{ follow: TwitchFollowPayload }>();
</script>

<template>
  <WidgetFrame variant="red">
    <div class="flex h-full items-center gap-x-1 text-xl">
      🎉 Thanks for the follow,
      <span class="text-event-red text-3xl font-bold">{{ follow.username }}!</span> Welcome to the
      Foxsphere family! 🚀
    </div>
  </WidgetFrame>
</template>
