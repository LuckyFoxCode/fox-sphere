<script setup lang="ts">
import { IconPokeball, IconUser } from '@/assets/icons';
import { PokemonCard } from '@/components/ui/pokemon-card';
import type { PokemonAssignedPayload } from '@fox-sphere/types';

defineProps<{ newUser: PokemonAssignedPayload }>();
</script>

<template>
  <PokemonCard
    variants="blue"
    :species-name="newUser.speciesName"
    :sprite-url="newUser.spriteUrl"
  >
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
  </PokemonCard>
</template>
