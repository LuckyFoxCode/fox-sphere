<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { LotteryTicketEarnedPayload } from '@fox-sphere/types';

defineProps<{ ticket: LotteryTicketEarnedPayload }>();
</script>

<template>
  <WidgetFrame>
    <div class="flex h-full items-center gap-x-1 px-1 text-lg">
      🎉 <span class="text-event-blue text-2xl font-bold">{{ ticket.username }}</span> earned enough
      weekly XP and received a Lottery Ticket! Good luck! 🎫✨
    </div>
  </WidgetFrame>
</template>
