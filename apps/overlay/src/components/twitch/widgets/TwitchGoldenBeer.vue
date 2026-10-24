<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import { getGoldenBeerTierLabel, pivoTierAchievementPath } from '@/constants';
import type { TwitchGoldenBeerPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ goldenBeer: TwitchGoldenBeerPayload }>();

const achievementSrc = computed(() => pivoTierAchievementPath(props.goldenBeer.tier));

const tierLabel = computed(() => getGoldenBeerTierLabel(props.goldenBeer.tier));
</script>

<template>
  <WidgetFrame
    variant="purple"
    position-x="100"
  >
    <div class="relative flex items-center justify-center gap-12 px-4 py-2">
      <span
        v-if="goldenBeer.isNewTier"
        class="border-event-cyan bg-event-cyan/15 text-event-cyan absolute top-1 right-1 flex w-fit rounded-lg border-2 px-1.5 py-1 text-xs font-semibold tracking-wider uppercase"
      >
        new
      </span>

      <img
        :src="achievementSrc"
        :alt="`Golden beer achievement: ${tierLabel}`"
        class="size-50 shrink-0 object-contain"
      />

      <div class="flex flex-col items-center pt-3 text-center">
        <span
          class="text-event-amber mb-2 flex items-center gap-1.5 text-xs font-medium tracking-[0.35em] uppercase"
        >
          🍺 Golden Beer
        </span>

        <span
          class="text-event-purple text-6xl leading-none font-semibold drop-shadow-[0_0_7px_var(--color-event-purple)]"
        >
          x{{ goldenBeer.goldenBeers }}
        </span>

        <p class="text-text-main/80 mt-2 mb-2 text-sm font-medium">
          {{ tierLabel }} brew — legendary drop!
        </p>

        <span
          class="text-event-red mb-2 text-base font-semibold drop-shadow-[0_0_5px_var(--color-event-red)]"
        >
          {{ goldenBeer.displayName }}
        </span>
      </div>
    </div>
  </WidgetFrame>
</template>
