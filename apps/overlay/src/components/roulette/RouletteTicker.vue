<script setup lang="ts">
import { IconLotteryWheel } from '@/assets/icons';
import { StickerFrame } from '@/components/ui';
import { useRouletteSocket } from '@/composables/sockets';
import { socket } from '@/services';

const { jackpotTotal, isJackpotLoading } = useRouletteSocket(socket);
</script>

<template>
  <StickerFrame
    role="status"
    aria-label="Take the roulette bank — command !spin"
    class="gap-x-2.5 py-1 pr-2 pl-2.5"
  >
    <IconLotteryWheel
      aria-hidden="true"
      class="animate-spin-slow text-sticker-rose size-7 shrink-0"
    />

    <div class="relative flex flex-col leading-none">
      <span class="text-sticker-muted text-[10px] font-bold tracking-[0.17em] uppercase">
        take bank
      </span>
      <span
        v-if="isJackpotLoading"
        aria-hidden="true"
        class="bg-sticker-track mt-1 block h-4 w-14 animate-pulse rounded"
      />
      <Transition
        v-else
        name="reel"
        mode="out-in"
      >
        <span
          :key="jackpotTotal"
          class="text-sticker-ink mt-1 text-lg font-bold tabular-nums"
        >
          {{ jackpotTotal.toLocaleString('en-US') }}
        </span>
      </Transition>
    </div>

    <span
      class="bg-sticker-edge text-sticker-body ml-0.5 rounded-lg px-2 py-0.5 text-sm font-bold tracking-wide"
    >
      !spin
    </span>
  </StickerFrame>
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

.animate-spin-slow {
  animation: spin-slow 4s linear infinite;
}

.reel-enter-active,
.reel-leave-active {
  transition:
    opacity 140ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 140ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 140ms cubic-bezier(0.16, 1, 0.3, 1);
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
  .animate-spin-slow {
    animation: none;
  }
}
</style>
