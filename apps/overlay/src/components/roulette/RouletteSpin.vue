<script setup lang="ts">
import { useRouletteSocket } from '@/composables/sockets';
import type { RouletteStatus } from '@/composables/sockets/types';
import { ROULETTE_WHEEL_SEGMENTS, prizeToSegmentId } from '@/constants';
import { socket } from '@/services';
import { computeWheelRotation, pickSegmentIndex } from '@/utils/roulette';
import { ROULETTE_SPIN_ANIMATION_MS, type RouletteSpinResultPayload } from '@fox-sphere/types';
import { computed, nextTick, ref, watch } from 'vue';
import RouletteWheel from './RouletteWheel.vue';

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

// 4-6 полных оборотов перед торможением на выигрышном секторе.
const pickFullTurns = () => 4 + Math.floor(Math.random() * 3);

const rotation = ref(0);

const spinWheelToPrize = (status: RouletteStatus) => {
  const result = spinResult.value;
  if (status !== 'spinning' || !result) return;

  // Двойной rAF: сначала кадр со стартовой позицией, потом целевой угол —
  // иначе transition не сработает и колесо прыгнет на сектор мгновенно.
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const segmentIndex = pickSegmentIndex(ROULETTE_WHEEL_SEGMENTS, prizeToSegmentId(result));
        if (segmentIndex === null) return;

        rotation.value = computeWheelRotation(
          rotation.value,
          segmentIndex,
          ROULETTE_WHEEL_SEGMENTS.length,
          pickFullTurns(),
        );
      });
    });
  });
};

watch(currentRouletteStatus, spinWheelToPrize, { immediate: true });
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
        v-if="isSpinning || isResult"
        key="wheel"
        class="flex flex-col items-center gap-4"
      >
        <RouletteWheel
          :segments="ROULETTE_WHEEL_SEGMENTS"
          :rotation="rotation"
          :duration-ms="ROULETTE_SPIN_ANIMATION_MS"
        />

        <div class="bg-card/90 border-line rounded-xl border px-6 py-2 text-center">
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
          <div class="text-event-purple mt-2 text-3xl font-black">ДЖЕКПОТ!</div>
          <div class="text-text-main mt-1 text-xl">
            {{ spinResult?.username }} забирает {{ formatJackpotAmount(spinResult) }} 🪙
          </div>
          <div class="text-event-purple/80 mt-2 text-sm">
            Банк: {{ jackpotTotal.toLocaleString('ru-RU') }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
