<script setup lang="ts">
import { FlipDigit } from '@/components/ui';
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchTimerPayload } from '@fox-sphere/types';

defineProps<{ timer: TwitchTimerPayload; timeDigits: string[] }>();
</script>

<template>
  <div>
    <WidgetFrame
      :variant="timer.color"
      :is-shadow="false"
    >
      <div class="flex h-full w-full flex-col items-center">
        <h4 class="text-xs capitalize">{{ timer.title }}</h4>
        <div class="flex w-3/4 flex-1 items-center justify-center gap-x-2">
          <template
            v-for="(char, index) in timeDigits"
            :key="index"
          >
            <span
              v-if="char === ':'"
              class="mx-1 animate-pulse text-5xl"
              >:</span
            >
            <FlipDigit
              v-else
              :char="char"
              :color="timer.color"
            />
          </template>
        </div>
      </div>
    </WidgetFrame>
  </div>
</template>
