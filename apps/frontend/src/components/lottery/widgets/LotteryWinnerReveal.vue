<script setup lang="ts">
import { computed } from 'vue';
import WidgetLayout from './WidgetLayout.vue';

const props = defineProps<{
  place: number;
  username: string;
  lostPlace?: number;
}>();

const firstLetter = computed(() => props.username.charAt(0).toUpperCase());
</script>

<template>
  <WidgetLayout cardClass="w-96 h-44">
    <div class="border-line/20 flex w-full items-center justify-between border-b pb-2">
      <div class="flex items-center gap-x-2">
        <span class="relative flex size-2">
          <span
            class="bg-lime absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          ></span>
          <span class="bg-lime relative inline-flex size-2 rounded-full"></span>
        </span>
        <span class="text-text-second text-[11px] font-black tracking-[0.2em] uppercase opacity-80">
          Winner Drawn
        </span>
      </div>

      <span
        class="bg-lime/10 border-lime/30 text-lime rounded-md border px-2.5 py-0.5 text-xs font-black tracking-wider uppercase shadow-[0_0_10px_rgba(163,230,53,0.1)]"
      >
        🏆 Place #{{ place }}
      </span>
    </div>

    <div class="my-auto flex w-full items-center gap-x-4 text-left">
      <div
        class="border-lime/25 bg-popover font-rubik text-lime relative flex size-16 shrink-0 items-center justify-center rounded-xl border text-2xl font-black shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_0_15px_rgba(163,230,53,0.15)]"
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
          class="text-text-main truncate text-2xl font-black tracking-wide capitalize drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          {{ username }}
        </span>
        <p class="text-text-second mt-0.5 text-xs font-medium">
          Claimed weekly
          <span class="text-lime font-bold drop-shadow-[0_0_6px_rgba(163,230,53,0.3)]"
            >VIP status</span
          >! 🎫
        </p>
      </div>
    </div>
  </WidgetLayout>
</template>
