<script setup lang="ts">
import { IconDna, IconLightning, IconPokeball, IconUser } from '@/assets/icons';
import { PokemonCard } from '@/components/ui/pokemon-card';
import type { UserLevelUpPayload } from '@fox-sphere/types';

defineProps<{ levelUp: UserLevelUpPayload }>();
</script>

<template>
  <PokemonCard
    variants="purple"
    :sprite-url="levelUp.pokemon!.spriteUrl"
    :species-name="levelUp.pokemon!.speciesName"
    position-x="75"
    title="New level unlocked!"
    subtitle="Keep training and climb the ranks"
  >
    <div class="ml-5 flex flex-col gap-y-1.5 overflow-hidden">
      <div class="flex items-center gap-x-1.5 text-sm">
        <IconUser class="text-event-purple size-4 shrink-0" />
        <span class="text-text-second capitalize">trainer:</span>
        <span class="text-event-amber truncate font-bold ...">{{ levelUp.username }}</span>
        <span
          class="bg-event-amber/20 text-event-amber rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
        >
          lvl {{ levelUp.newLevel }}
        </span>
      </div>

      <div class="flex items-center gap-x-1.5 text-sm">
        <IconPokeball class="text-event-purple size-4 shrink-0" />
        <span class="text-text-second capitalize">pokemon:</span>
        <span class="text-event-amber font-bold uppercase ...">{{
          levelUp.pokemon?.speciesName
        }}</span>
      </div>

      <div class="flex items-center gap-x-1.5 text-xs">
        <IconLightning class="text-event-purple size-4 shrink-0" />
        <span class="text-text-second uppercase">lvl {{ levelUp.pokemon?.lvl }}</span>
        <span class="text-text-second uppercase">xp {{ levelUp.pokemon?.xp }}</span>
      </div>

      <div
        v-if="levelUp.pokemon?.isReadyToEvolve"
        class="flex items-center gap-x-1.5 text-sm"
      >
        <IconDna class="text-event-purple size-4 shrink-0" />
        <span class="text-lime font-semibold uppercase ...">evolve ready</span>
      </div>
    </div>
  </PokemonCard>
</template>
