<script setup lang="ts">
import { useLotterySocket, type LotteryStatus } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import {
  LotteryAnnouncePanel,
  LotteryFinalSummary,
  LotteryParticipants,
  LotteryTicket,
  LotteryWinnerReveal,
} from './widgets';

const { ticket, winner, winners, currentLotteryStatus, participants } = useLotterySocket(socket);

interface WidgetMapValue {
  component: Component;
  props?: Record<string, unknown>;
}

type ActiveLotteryEvent = Exclude<LotteryStatus, 'idle'>;

const widgetConfig = computed(() => {
  if (currentLotteryStatus.value === 'idle') return null;

  const map: Record<ActiveLotteryEvent, WidgetMapValue> = {
    ticket: { component: LotteryTicket, props: { ticket: ticket.value } },
    started: { component: LotteryAnnouncePanel },
    drawer: { component: LotteryWinnerReveal, props: { winner: winner.value } },
    finished: { component: LotteryFinalSummary, props: { winners: winners.value } },
    participants: { component: LotteryParticipants, props: { participants: participants.value } },
  };

  return map[currentLotteryStatus.value as ActiveLotteryEvent] || null;
});
</script>

<template>
  <div class="fixed top-1/2 left-1/2 -translate-1/2">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <component
        :is="widgetConfig?.component"
        v-if="widgetConfig"
        v-bind="widgetConfig.props"
      />
    </Transition>
  </div>
</template>
