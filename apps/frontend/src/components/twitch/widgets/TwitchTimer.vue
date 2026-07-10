<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchTimerPayload } from '@fox-sphere/types';

const props = defineProps<{ timer: TwitchTimerPayload; timeDigits: string[] }>();
</script>

<template>
  <div>
    <WidgetFrame
      :variant="timer.color"
      :is-shadow="false"
    >
      <div class="flex h-full w-full flex-col items-center">
        <h4 class="text-xs capitalize">{{ timer.title }}</h4>
        <div class="flex w-3/4 flex-1 items-center justify-center text-5xl">
          <template
            v-for="(char, index) in timeDigits"
            :key="index"
          >
            <span
              v-if="char === ':'"
              class="mx-1 animate-pulse"
              >:</span
            >
            <div
              v-else
              class="rounded border border-purple-500/30 bg-[#1a1126] px-3 py-2 text-white"
            >
              {{ char }}
            </div>
          </template>
        </div>
      </div>
    </WidgetFrame>
  </div>
</template>
