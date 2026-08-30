<script setup lang="ts">
import type { WidgetVariant } from '@fox-sphere/types';
import WidgetFrame from '../widget-frame/WidgetFrame.vue';

interface PokemonCardProps {
  spriteUrl: string;
  speciesName: string;
  variants?: WidgetVariant;
  positionY?: string;
  positionX?: string;
  title: string;
  subtitle: string;
}

defineProps<PokemonCardProps>();
</script>

<template>
  <WidgetFrame
    :variant="variants"
    :position-x="positionX"
    :position-y="positionY"
  >
    <div class="flex flex-col p-3">
      <span class="text-text-main/45 mb-2 text-center leading-none">{{ title }}</span>
      <div class="mb-3 flex h-full items-center">
        <div
          class="relative flex size-20 shrink-0 items-center justify-center rounded-xl border-2"
          :class="` shadow-[inset_0_0_12px_var(--color-event-${variants})]/15`"
          :style="{
            borderColor: `color-mix(in oklab, var(--color-event-${variants}) 30%, transparent)`,
            boxShadow: `inset 0 0 12px color-mix(in oklab, var(--color-event-${variants}) 15%, transparent)`,
            background: `color-mix(in oklab, var(--color-event-${variants}) 5%, transparent)`,
          }"
        >
          <img
            :src="spriteUrl"
            :alt="speciesName"
            class="h-16 object-contain drop-shadow-[0_4px_8px_var(--color-bg)]/50"
          />
        </div>
        <slot />
      </div>
      <span
        class="text-center leading-none"
        :style="{ color: `color-mix(in oklab, var(--color-event-${variants}) 50%, transparent` }"
        >{{ subtitle }}</span
      >
    </div>
  </WidgetFrame>
</template>
