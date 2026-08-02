<script setup lang="ts">
import { IconPokeball, IconUser } from '@/assets/icons';
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { PokemonAssignedPayload } from '@fox-sphere/types';

defineProps<{ newUser: PokemonAssignedPayload }>();
</script>

<template>
  <WidgetFrame>
    <div class="flex h-full w-75 items-center gap-x-5 p-3">
      <div
        class="border-event-blue/30 bg-event-blue/5 relative flex size-20 shrink-0 items-center justify-center rounded-xl border-2 shadow-[inset_0_0_12px_var(--color-event-blue)]/15"
      >
        <img
          :src="newUser.spriteUrl"
          :alt="newUser.speciesName"
          class="size-16 object-contain drop-shadow-[0_4px_8px_var(--color-bg)]/50"
        />
      </div>

      <div class="flex flex-col justify-center gap-y-1.5 overflow-hidden">
        <div class="flex items-center">
          <span
            class="bg-event-rose/20 text-event-rose rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
          >
            New Trainer
          </span>
        </div>

        <div class="flex items-center gap-x-1.5 text-sm">
          <IconUser class="text-event-blue size-4 shrink-0" />
          <span class="truncate font-semibold">
            {{ newUser.username }}
          </span>
        </div>

        <div class="text-text-second flex items-center gap-x-1.5 text-xs">
          <IconPokeball class="animate-spin-slow text-event-blue size-4 shrink-0" />
          <span>got</span>
          <span
            class="text-event-amber text-base font-bold tracking-wide uppercase drop-shadow-[0_0_6px_var(--color-event-amber)]/30"
          >
            {{ newUser.speciesName }}
          </span>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>
