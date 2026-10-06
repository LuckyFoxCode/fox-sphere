<script setup lang="ts">
import { IconRank, IconUser } from '@/assets/icons';
import { HeroCard } from '@/components/ui';
import { DEFAULT_HERO_ID, getHeroById } from '@/utils/hero';
import type { UserLevelUpPayload } from '@fox-sphere/types';

defineProps<{ levelUp: UserLevelUpPayload }>();
</script>

<template>
  <HeroCard
    variants="purple"
    :hero-id="levelUp.hero?.heroId ?? DEFAULT_HERO_ID"
    position-x="75"
    title="New level unlocked!"
    subtitle="Keep training and climb the ranks"
  >
    <div class="ml-5 flex flex-col gap-y-1.5 overflow-hidden">
      <div class="flex items-center gap-x-1.5 text-sm">
        <IconUser class="text-event-purple size-4 shrink-0" />
        <span class="text-text-second capitalize">viewer:</span>
        <span class="text-event-amber truncate font-bold ...">{{ levelUp.username }}</span>
        <span
          class="bg-event-amber/20 text-event-amber rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
        >
          lvl {{ levelUp.newLevel }}
        </span>
      </div>

      <div
        v-if="levelUp.hero"
        class="flex items-center gap-x-1.5 text-sm"
      >
        <IconRank class="text-event-purple size-4 shrink-0" />
        <span class="text-text-second capitalize">hero:</span>
        <span class="text-event-amber font-bold uppercase ...">{{
          getHeroById(levelUp.hero.heroId).name
        }}</span>
      </div>
    </div>
  </HeroCard>
</template>
