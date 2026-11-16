<script setup lang="ts">
import { EventSticker } from '@/components/ui';
import { getGoldenBeerTierLabel, pivoTierAchievementPath } from '@/constants';
import type { TwitchGoldenBeerPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ goldenBeer: TwitchGoldenBeerPayload }>();

const achievementSrc = computed(() => pivoTierAchievementPath(props.goldenBeer.tier));

const tierLabel = computed(() => getGoldenBeerTierLabel(props.goldenBeer.tier));
</script>

<template>
  <EventSticker
    variant="amber"
    :media-src="achievementSrc"
    :media-alt="`Golden beer achievement: ${tierLabel} tier`"
    label="golden beer"
    :figure="`x${goldenBeer.goldenBeers}`"
    :title="goldenBeer.displayName"
    :detail="`${tierLabel} brew`"
    :tag="goldenBeer.isNewTier ? 'new tier' : undefined"
  />
</template>
