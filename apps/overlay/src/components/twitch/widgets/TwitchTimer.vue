<script setup lang="ts">
import { FlipDigit, StickerFrame } from '@/components/ui';
import type { TwitchTimerPayload } from '@fox-sphere/types';

defineProps<{ timer: TwitchTimerPayload; timeDigits: string[] }>();
</script>

<template>
  <StickerFrame
    role="timer"
    :aria-label="`${timer.title} — ${timeDigits.join('')}`"
    class="w-full flex-col gap-y-2.5 px-3.5 pt-2.5 pb-3"
  >
    <h4 class="text-sticker-ink w-full truncate text-center text-base leading-none font-bold">
      {{ timer.title }}
    </h4>
    <div class="flex items-center justify-center gap-x-2">
      <template
        v-for="(char, index) in timeDigits"
        :key="index"
      >
        <span
          v-if="char === ':'"
          class="text-sticker-ink/55 text-[34px] leading-none font-bold select-none"
          >:</span
        >
        <FlipDigit
          v-else
          :char="char"
          :color="timer.color"
        />
      </template>
    </div>
  </StickerFrame>
</template>
