<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { LotteryTicketEarnedPayload } from '@fox-sphere/types';

defineProps<{ ticket: LotteryTicketEarnedPayload }>();
</script>

<template>
  <WidgetFrame>
    <p class="text-lg">
      🎉 <span class="text-event-blue text-2xl font-bold">{{ ticket.username }}</span> earned enough
      weekly XP and received a Lottery Ticket! Good luck! 🎫✨
    </p>
  </WidgetFrame>
</template>
