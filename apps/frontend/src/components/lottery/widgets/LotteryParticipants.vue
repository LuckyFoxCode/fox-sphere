<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { LotteryParticipantsPayload } from '@fox-sphere/types';

defineProps<{ participants: LotteryParticipantsPayload }>();
</script>

<template>
  <WidgetFrame>
    <div class="flex h-full flex-col gap-y-2 px-1 py-3">
      <ul class="grid grid-cols-10 gap-2 pb-2">
        <li
          class="bg-event-blue/10 text-text-main/90 rounded-xl border-2 border-transparent px-2 py-2 text-center text-sm"
          v-for="participiant in participants"
          :key="participiant.twitchId"
        >
          {{ participiant.username }}
        </li>
      </ul>
      <span
        class="border-text-second/10 text-text-second/80 border-t-2 pt-2 text-center text-sm uppercase"
        >Total: {{ participants.length }} entries</span
      >
    </div>
  </WidgetFrame>
</template>
