<script setup lang="ts">
import type { WidgetVariant } from '@fox-sphere/types';
import WidgetFrame from '../widget-frame/WidgetFrame.vue';

interface PokemonCardProps {
  spriteUrl: string;
  speciesName: string;
  variants?: WidgetVariant;
}

defineProps<PokemonCardProps>();
</script>

<template>
  <WidgetFrame :variant="variants">
    <div class="flex h-full items-center p-3">
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
          class="size-16 object-contain drop-shadow-[0_4px_8px_var(--color-bg)]/50"
        />
      </div>
      <slot />
    </div>
  </WidgetFrame>
</template>
