<script setup lang="ts">
import WidgetLayout from './WidgetLayout.vue';
</script>

<template>
  <WidgetLayout cardClass="w-lg h-64">
    <div class="flex items-center justify-center gap-x-2">
      <span class="relative flex size-2">
        <span
          class="bg-lime absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        ></span>
        <span class="bg-lime relative inline-flex size-2 rounded-full"></span>
      </span>
      <span
        class="text-lime text-xs font-black tracking-[0.35em] uppercase drop-shadow-[0_0_6px_rgba(163,230,53,0.3)]"
      >
        System Event
      </span>
    </div>

    <div class="flex items-center gap-x-6 px-4 text-left">
      <div
        class="border-line bg-popover/90 relative flex size-20 shrink-0 items-center justify-center rounded-2xl border shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_0_12px_rgba(163,230,53,0.1)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="text-lime size-12 drop-shadow-[0_0_10px_rgba(163,230,53,0.6)]"
        >
          <path
            fill="currentColor"
            d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z"
          >
            <animateTransform
              attributeName="transform"
              dur="2.5s"
              repeatCount="indefinite"
              type="rotate"
              values="0 12 12;360 12 12"
            />
          </path>
        </svg>
      </div>

      <div class="flex flex-col gap-y-1">
        <h2 class="text-text-main text-2xl leading-none font-black tracking-wide uppercase">
          Weekly Lottery Started
        </h2>
        <p class="text-text-second mt-1 text-sm leading-relaxed font-medium">
          Spinning the Wheel of Fortune on overlay. <br />
          Who will get the next
          <span class="text-lime font-bold drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]"
            >VIP status</span
          >?
        </p>
      </div>
    </div>

    <div class="bg-line/50 border-line/30 relative h-2 w-full overflow-hidden rounded-full border">
      <div
        class="from-lime/60 via-lime to-lime/80 custom-progress-bar absolute inset-y-0 left-0 w-full bg-linear-to-r shadow-[0_0_12px_rgba(163,230,53,0.8)]"
      >
        <div
          class="animate-shine absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
        ></div>
      </div>
    </div>
  </WidgetLayout>
</template>

<style scoped>
.custom-progress-bar {
  animation: loading 5s ease-in-out infinite;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(-15%);
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

.animate-shine {
  animation: shine 2s infinite linear;
}
</style>
