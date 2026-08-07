<script setup lang="ts">
import { IconDna, IconLightning, IconPokeball, IconUser } from '@/assets/icons';
import { PokemonCard } from '@/components/ui/pokemon-card';
import type { UserLevelUpPayload } from '@fox-sphere/types';

defineProps<{ levelUp: UserLevelUpPayload }>();
</script>

<template>
  <PokemonCard
    variants="rose"
    :sprite-url="levelUp.pokemon!.spriteUrl"
    :species-name="levelUp.pokemon!.speciesName"
  >
    <div class="ml-8 flex w-62.5 flex-col gap-y-2">
      <div class="flex flex-col">
        <div class="text-text-second flex items-center gap-x-1.5 text-sm">
          <IconUser class="text-event-blue size-4 shrink-0" />
          <span class="capitalize">trainer:</span>
          <span
            class="text-event-amber text-base font-bold tracking-wide drop-shadow-[0_0_6px_var(--color-event-amber)]/30"
          >
            {{ levelUp.username }} - [ lvl: {{ levelUp.newLevel }} ]
          </span>
        </div>
      </div>
      <div class="flex flex-col">
        <div class="text-text-second flex items-center gap-x-1.5 text-sm">
          <IconPokeball class="text-event-blue size-4 shrink-0" />
          <span class="capitalize">pokemon:</span>
          <span
            class="text-event-amber text-base font-bold tracking-wide uppercase drop-shadow-[0_0_6px_var(--color-event-amber)]/30"
          >
            {{ levelUp.pokemon?.speciesName }}
          </span>
        </div>

        <div class="flex items-center gap-x-1.5 text-sm">
          <IconLightning class="text-event-blue size-4 shrink-0" />
          <span class="truncate font-semibold">
            LVL: {{ levelUp.pokemon?.lvl }} [ XP: {{ levelUp.pokemon?.xp }} ]
          </span>
        </div>

        <div
          v-if="!levelUp.pokemon?.isReadyToEvolve"
          class="flex items-center gap-x-1.5 text-sm"
        >
          <IconDna class="text-event-blue size-4 shrink-0" />
          <span class="text-text-second truncate font-semibold uppercase"> status: </span>
          <span
            class="bg-event-blue/20 border-event-blue text-lime inline-flex rounded-md border-2 px-1 py-1.5 font-medium capitalize"
            >evolve ready</span
          >
        </div>
      </div>
      <span class="text-text-main/75 text-lg">Look who's getting powerful! 🚀</span>
    </div>
  </PokemonCard>
</template>
