<script setup lang="ts">
import { useRouletteSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';
import type { RouletteSpinResultPayload } from '@fox-sphere/types';

const { currentRouletteStatus, spinResult, jackpotTotal } = useRouletteSocket(socket);

const isIdle = computed(() => currentRouletteStatus.value === 'idle');
const isSpinning = computed(() => currentRouletteStatus.value === 'spinning');
const isResult = computed(() => currentRouletteStatus.value === 'result');
const isJackpot = computed(() => currentRouletteStatus.value === 'jackpot');

const resultMessage = computed(() => {
  const result = spinResult.value;
  if (!result) return '';
  if (result.prizeType === 'coins') return `+${result.coinAmount} монет 🪙`;
  if (result.prizeType === 'xp') return `+${result.xpAmount} XP ⚡`;
  return '…и ничего 🎲';
});

const formatJackpotAmount = (result: RouletteSpinResultPayload | null) =>
  result ? result.coinAmount.toLocaleString('ru-RU') : '0';
</script>

<template>
  <div
    v-if="!isIdle"
    class="pointer-events-none fixed top-1/2 left-1/2 -translate-1/2"
  >
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <div v-if="isSpinning" class="animate-spin text-7xl">🎰</div>

      <div
        v-else-if="isResult"
        class="rounded-lg bg-card/90 px-6 py-4 text-center"
      >
        <div class="font-bold text-white">{{ spinResult?.username }}</div>
        <div class="mt-1 text-2xl text-amber-200">{{ resultMessage }}</div>
      </div>

      <div
        v-else-if="isJackpot"
        class="fixed inset-0 flex items-center justify-center bg-black/70"
      >
        <div class="animate-pulse rounded-xl bg-amber-500/20 px-10 py-8 text-center">
          <div class="text-5xl">👑🎰</div>
          <div class="mt-2 text-3xl font-black text-amber-300">ДЖЕКПОТ!</div>
          <div class="mt-1 text-xl text-white">
            {{ spinResult?.username }} забирает {{ formatJackpotAmount(spinResult) }} 🪙
          </div>
          <div class="mt-2 text-sm text-amber-200">
            Банк: {{ jackpotTotal.toLocaleString('ru-RU') }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
