<script setup lang="ts">
import { IconLotteryWheel } from '@/assets/icons';
import { useRouletteSocket } from '@/composables/sockets';
import { socket } from '@/services';

const { jackpotTotal, isJackpotLoading } = useRouletteSocket(socket);
</script>

<template>
  <div
    role="status"
    aria-label="Take the roulette bank — command !spin"
    class="border-event-purple/40 bg-bg/90 relative flex items-center gap-x-3 rounded-2xl border-2 py-1 pr-2 pl-2.5 shadow-[0_0_3px_var(--color-event-purple)]"
  >
    <span
      aria-hidden="true"
      class="bg-event-purple/10 pointer-events-none absolute inset-0.5 rounded-2xl"
    />
    <IconLotteryWheel class="animate-spin-slow text-event-purple/80 size-8 shrink-0" />

    <div class="relative flex flex-col leading-none">
      <span class="text-text-second text-xs font-bold tracking-widest uppercase">take bank</span>
      <span
        v-if="isJackpotLoading"
        aria-hidden="true"
        class="bg-event-purple/40 animate-pulse block h-4 w-14 rounded"
      />
      <Transition
        v-else
        name="reel"
        mode="out-in"
      >
        <span
          :key="jackpotTotal"
          class="text-event-purple text-base font-bold tabular-nums"
        >
          {{ jackpotTotal.toLocaleString('en-US') }}
        </span>
      </Transition>
    </div>

    <span
      class="animate-cta-glow text-text-main rounded-full border-2 px-2 py-0.5 text-sm font-bold tracking-wide"
    >
      !spin
    </span>
  </div>
</template>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes cta-glow {
  0%,
  100% {
    border-color: color-mix(in oklab, var(--color-event-rose) 70%, transparent);
    box-shadow:
      0 0 6px color-mix(in oklab, var(--color-event-rose) 80%, transparent),
      inset 0 0 4px color-mix(in oklab, var(--color-event-rose) 30%, transparent);
  }
  33% {
    border-color: color-mix(in oklab, var(--color-event-cyan) 70%, transparent);
    box-shadow:
      0 0 6px color-mix(in oklab, var(--color-event-cyan) 80%, transparent),
      inset 0 0 4px color-mix(in oklab, var(--color-event-cyan) 30%, transparent);
  }
  66% {
    border-color: color-mix(in oklab, var(--color-event-red) 70%, transparent);
    box-shadow:
      0 0 6px color-mix(in oklab, var(--color-event-red) 80%, transparent),
      inset 0 0 4px color-mix(in oklab, var(--color-event-red) 30%, transparent);
  }
}

.animate-spin-slow {
  animation: spin-slow 4s linear infinite;
}

.animate-cta-glow {
  animation: cta-glow 3s ease-in-out infinite;
}

.reel-enter-active,
.reel-leave-active {
  transition:
    opacity 120ms ease-out,
    transform 120ms ease-out,
    filter 120ms ease-out;
}

.reel-enter-from {
  opacity: 0;
  transform: translateY(0.45em);
  filter: blur(2px);
}

.reel-leave-to {
  opacity: 0;
  transform: translateY(-0.45em);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin-slow,
  .animate-cta-glow {
    animation: none;
  }
}
</style>
