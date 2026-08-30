<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { LotteryParticipantsPayload } from '@fox-sphere/types';

defineProps<{ participants: LotteryParticipantsPayload }>();
</script>

<template>
  <WidgetFrame position-x="100">
    <div class="flex h-full flex-col gap-y-2 px-2 py-3">
      <ul
        class="grid gap-2 pb-2"
        :class="participants.length <= 20 ? 'grid-cols-5' : 'grid-cols-10'"
      >
        <li
          v-for="participiant in participants"
          :key="participiant.twitchId"
          class="from-event-blue/15 to-event-blue/5 text-text-main/90 border-text-main/5 truncate rounded-xl border-2 bg-linear-to-br text-center text-sm shadow-[inset_0_1px_1px_var(--color-event-blue,0.05)]"
          :class="participants.length <= 20 ? 'px-2 py-2 text-sm' : 'px-1 py-2 text-xs'"
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
