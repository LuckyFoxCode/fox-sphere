<template>
  <div class="flex w-100 items-center gap-x-2">
    <div class="border-text-second/50 flex size-7 items-center justify-center rounded-full border">
      <span>55</span>
    </div>
    <div class="flex flex-1 flex-col items-center text-xs">
      <span>5 / 1000</span>
      <div class="bg-event-cyan/10 h-3.5 w-full rounded-lg">
        <div
          :style="{ width: `3%` }"
          class="from-event-cyan/20 to-event-cyan/80 h-full rounded-lg bg-linear-to-r transition-[width] duration-500 ease-in-out"
        />
      </div>
    </div>
  </div>
</template>
