<script setup lang="ts">
import { IconLotteryWheel } from '@/assets/icons/';
import { WidgetFrame } from '../../ui/widget-frame/';
</script>

<template>
  <WidgetFrame position-x="150">
    <div class="flex flex-col items-center">
      <div class="mb-5 flex items-center justify-center gap-x-2">
        <span class="relative flex size-2">
          <span
            class="bg-lime absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          ></span>
          <span class="bg-lime relative inline-flex size-2 rounded-full"></span>
        </span>
        <span
          class="text-lime text-xs font-black tracking-[0.35em] uppercase drop-shadow-[0_0_6px_var(--color-lime,0.3)]"
        >
          Lottery Event
        </span>
      </div>

      <IconLotteryWheel
        class="text-lime animate-rotate mb-4 size-48 drop-shadow-[0_0_6px_var(--color-lime,0.6)]"
      />

      <div class="mb-8 flex items-center gap-x-6 px-4 text-left">
        <div class="flex flex-col gap-y-1">
          <h2 class="text-text-main text-4xl leading-none font-black tracking-wide uppercase">
            Weekly Lottery Started
          </h2>
          <p class="text-text-second mt-1 text-center text-lg leading-relaxed font-medium">
            Spinning the Wheel of Fortune on overlay. <br />
            Who will get the next
            <span class="text-lime font-bold drop-shadow-[0_0_8px_var(--color-lime,0.4)]"
              >VIP status</span
            >?
          </p>
        </div>
      </div>

      <div
        class="bg-line/50 border-line/30 relative h-2 w-full overflow-hidden rounded-full border"
      >
        <div
          class="from-lime/60 via-lime to-lime/80 custom-progress-bar absolute inset-y-0 left-0 w-full bg-linear-to-r shadow-[0_0_12px_var(--color-lime,0.8)]"
        >
          <div
            class="animate-shine via-text-main/40 absolute inset-0 bg-linear-to-r from-transparent to-transparent"
          ></div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<style scoped>
.custom-progress-bar {
  animation: loading 4s ease-in-out infinite;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0%);
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%) skewX(-15deg);
  }
  100% {
    transform: translateX(200%) skewX(-15deg);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-shine {
  animation: shine 2s infinite linear;
}

.animate-rotate {
  animation: rotate 4s infinite linear;
}
</style>
