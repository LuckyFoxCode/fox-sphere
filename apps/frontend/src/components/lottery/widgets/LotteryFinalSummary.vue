<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import { computed } from 'vue';

interface Winner {
  place?: number;
  username: string;
  twitchId: string;
}

const props = defineProps<{
  winners: Winner[];
}>();

const sortedWinners = computed(() => {
  return props.winners.map((winner, index) => ({
    ...winner,
    place: index + 1,
  }));
});

const getFirstLetter = (username: string) => username.charAt(0).toUpperCase();
</script>

<template>
  <WidgetFrame position-x="170">
    <div class="relative flex w-96 flex-col overflow-hidden rounded-2xl">
      <div class="mb-10 flex flex-col items-center">
        <span class="text-lime text-xs font-semibold tracking-[0.4em] uppercase">
          Weekly Event
        </span>
        <h2 class="text-text-main mt-0.5 text-2xl font-bold tracking-wide uppercase">
          Lottery Winners
        </h2>
      </div>

      <div class="divide-lime/30 mb-5 flex flex-col divide-y">
        <div
          v-for="winner in sortedWinners"
          :key="winner.twitchId"
          class="relative flex items-center justify-between px-4 py-3 transition-all duration-300"
        >
          <div class="flex min-w-0 items-center gap-x-3.5">
            <div
              class="font-rubik flex size-6 shrink-0 items-center justify-center text-xs font-black"
            >
              <span
                v-if="winner.place === 1"
                class="text-base drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                >🥇</span
              >
              <span
                v-else-if="winner.place === 2"
                class="text-base"
                >🥈</span
              >
              <span
                v-else-if="winner.place === 3"
                class="text-base"
                >🥉</span
              >
              <span
                v-else
                class="text-text-second/50 font-bold"
                >#{{ winner.place }}</span
              >
            </div>

            <div
              class="font-rubik flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-black shadow-md"
              :class="[
                winner.place === 1
                  ? 'bg-popover border-amber-500/30 text-amber-400'
                  : winner.place === 2
                    ? 'bg-popover border-slate-400/30 text-slate-300'
                    : winner.place === 3
                      ? 'bg-popover border-amber-700/30 text-amber-600'
                      : 'border-line/60 bg-popover/40 text-text-second',
              ]"
            >
              {{ getFirstLetter(winner.username) }}
            </div>

            <span
              class="truncate font-bold tracking-wide capitalize"
              :class="[
                winner.place === 1
                  ? 'bg-linear-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(--color-bg-bg,0.3)]'
                  : winner.place === 2
                    ? 'bg-linear-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent'
                    : winner.place === 3
                      ? 'bg-linear-to-r from-amber-600 to-amber-700 bg-clip-text text-base text-transparent'
                      : 'text-text-main font-bold',
              ]"
            >
              {{ winner.username }}
            </span>
          </div>

          <div class="flex shrink-0 items-center pl-2">
            <span class="flex items-center gap-x-1 text-sm font-bold">
              🎫
              <span class="text-lime/80 text-xs font-black tracking-wider uppercase">VIP</span>
            </span>
          </div>
        </div>
      </div>

      <div class="border-line/20 border-t px-4 py-2.5 text-center">
        <p class="text-text-second/80 text-xs font-bold tracking-wider uppercase">
          ✨ All Rewards Distributed ✨
        </p>
      </div>
    </div>
  </WidgetFrame>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
