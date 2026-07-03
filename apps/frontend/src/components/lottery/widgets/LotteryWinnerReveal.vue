<script setup lang="ts">
import { computed } from 'vue';
import { WidgetFrame } from '../../ui/widget-frame/';

const props = defineProps<{
  place: number;
  username: string;
  lostPlace?: number;
}>();

const firstLetter = computed(() => props.username.charAt(0).toUpperCase());
</script>

<template>
  <WidgetFrame
    position-x="85"
    position-y="200"
  >
    <div class="min-w-100">
      <div class="border-line/20 mb-2 flex w-full items-center justify-between border-b">
        <div class="flex items-center gap-x-2">
          <span class="relative flex size-2">
            <span
              class="bg-lime absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            />
            <span class="bg-lime relative inline-flex size-2 rounded-full" />
          </span>
          <span
            class="text-text-second align-middle text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80"
          >
            Winner Drawn
          </span>
        </div>

        <span
          class="bg-lime/5 border-lime/40 text-lime/70 rounded-md border-2 px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase"
        >
          🏆 Place <span class="text-lime">#{{ place }}</span>
        </span>
      </div>

      <div class="my-auto flex w-full items-center gap-x-4 text-left">
        <div
          class="border-lime/25 bg-popover font-rubik text-lime relative flex size-16 shrink-0 items-center justify-center rounded-xl border text-2xl font-black shadow-[0_8px_20px_var(--color-bg-bg,0.4),inset_0_0_15px_var(--color-lime,0.15)]"
        >
          {{ firstLetter }}
          <span class="absolute -top-1 -right-1 flex size-3">
            <span
              class="bg-lime absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            ></span>
            <span
              class="bg-lime border-card relative inline-flex size-3 rounded-full border-2"
            ></span>
          </span>
        </div>

        <div class="flex min-w-0 flex-col">
          <span
            class="text-text-main truncate text-3xl font-semibold tracking-wide capitalize drop-shadow-[0_2px_4px_var(--color-bg-bg,0.5)]"
          >
            {{ username }}
          </span>
          <p class="text-text-second mt-0.5 text-sm font-medium">
            Claimed weekly
            <span class="text-lime font-medium">VIP status</span>! 🎫
          </p>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>
