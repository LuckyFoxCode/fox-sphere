<script setup lang="ts">
import { useRouletteSocket } from '@/composables/sockets';
import { prizeToSegmentId } from '@/constants';
import { socket } from '@/services';
import { buildTapeStrip } from '@/utils/roulette';
import { ROULETTE_SPIN_ANIMATION_MS, type RouletteSpinResultPayload } from '@fox-sphere/types';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import TapeStrip from './TapeStrip.vue';

const JACKPOT_TAPE_PREVIEW_MS = 1000;

const { currentRouletteStatus, spinResult, jackpotTotal } = useRouletteSocket(socket);

const isIdle = computed(() => currentRouletteStatus.value === 'idle');
const isSpinning = computed(() => currentRouletteStatus.value === 'spinning');
const isResult = computed(() => currentRouletteStatus.value === 'result');
const isJackpot = computed(() => currentRouletteStatus.value === 'jackpot');

// Джекпот: ~1с лента с пульсацией легендарки, затем takeover-оверлей.
const showJackpotTape = ref(false);
let jackpotPreviewTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (jackpotPreviewTimer) clearTimeout(jackpotPreviewTimer);
});

watch(currentRouletteStatus, (status) => {
  if (status === 'jackpot') {
    showJackpotTape.value = true;
    jackpotPreviewTimer = setTimeout(() => {
      showJackpotTape.value = false;
    }, JACKPOT_TAPE_PREVIEW_MS);
  } else {
    if (jackpotPreviewTimer) {
      clearTimeout(jackpotPreviewTimer);
      jackpotPreviewTimer = null;
    }
    showJackpotTape.value = false;
  }
});

const showTape = computed(
  () => isSpinning.value || isResult.value || (isJackpot.value && showJackpotTape.value),
);

const tapeRevealed = computed(() => isResult.value || (isJackpot.value && showJackpotTape.value));

const stripSegments = computed(() =>
  spinResult.value ? buildTapeStrip(prizeToSegmentId(spinResult.value)) : [],
);

const resultMessage = computed(() => {
  const result = spinResult.value;
  if (!result) return '';
  if (result.prizeType === 'coins') return `+${result.coinAmount} coins 🪙`;
  if (result.prizeType === 'xp') return `+${result.xpAmount} XP ⚡`;
  return '...and nothing 🎲';
});

const formatJackpotAmount = (result: RouletteSpinResultPayload | null) =>
  result ? result.coinAmount.toLocaleString('en-US') : '0';
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
      <div
        v-if="showTape"
        key="tape"
        class="flex flex-col items-center gap-4"
      >
        <TapeStrip
          :segments="stripSegments"
          :duration-ms="ROULETTE_SPIN_ANIMATION_MS"
          :reveal="tapeRevealed"
        />

        <div class="bg-card/90 border-line rounded-xl border px-6 py-4 text-center">
          <div class="text-text-main font-bold">{{ spinResult?.username }}</div>
          <div
            v-if="isResult"
            class="text-event-purple text-2xl font-extrabold"
          >
            {{ resultMessage }}
          </div>
        </div>
      </div>

      <div
        v-else-if="isJackpot"
        key="jackpot"
        class="bg-bg/70 fixed inset-0 flex items-center justify-center"
      >
        <div class="bg-event-purple/20 animate-pulse rounded-xl px-10 py-8 text-center">
          <div class="text-5xl">👑🎰</div>
          <div class="text-event-purple mt-2 text-3xl font-black">JACKPOT!</div>
          <div class="text-text-main mt-1 text-xl">
            {{ spinResult?.username }} takes {{ formatJackpotAmount(spinResult) }} 🪙
          </div>
          <div class="text-event-purple/80 mt-2 text-sm">
            Bank: {{ jackpotTotal.toLocaleString('en-US') }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
