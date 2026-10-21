<script setup lang="ts">
import { HeroPortrait } from '@/components/ui';
import { WidgetFrame } from '@/components/ui/widget-frame';
import {
  getRankConfigByLevel,
  MAX_ICON_TIER,
  PROFILE_ACHIEVEMENT_SLOTS,
  PROFILE_ACHIEVEMENT_SLOT_COUNT,
  RANK_BADGES,
  type ProfileAchievement,
} from '@/constants';
import type { ProfileShowPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ profile: ProfileShowPayload }>();

/**
 * Rank comes off `lvl` alone - the payload carries no broadcaster or bot flag, so the special
 * `GAME MASTER` / `SYSTEM BOT` titles stay in chat and the hero lane. Tier 10 (`OVERLORD`) is
 * drawn with the ninth badge on purpose, same as `ChatMessageItem`.
 */
const rank = computed(() => getRankConfigByLevel(props.profile.lvl));

const rankBadge = computed(() => RANK_BADGES[Math.min(rank.value.tier, MAX_ICON_TIER)]);

interface RoleChip {
  label: string;
  classes: string;
}

const roleChips = computed<RoleChip[]>(() => {
  const chips: RoleChip[] = [];

  if (props.profile.isFounder) {
    chips.push({
      label: 'founder',
      classes: 'bg-event-purple/10 border-event-purple/30 text-event-purple ',
    });
  }
  if (props.profile.isMod) {
    chips.push({ label: 'mod', classes: 'bg-event-cyan/10 border-event-cyan/30  text-event-cyan' });
  }
  if (props.profile.isPermanentVip) {
    chips.push({
      label: 'vip',
      classes: 'bg-event-rose/10 text-event-rose border-event-rose/30',
    });
  }
  if (props.profile.isLuckyVip) {
    chips.push({
      label: 'lucky vip',
      classes: 'bg-lime/10 border-lime/30 text-lime',
    });
  }
  if (props.profile.isSubscriber) {
    chips.push({ label: 'sub', classes: 'bg-event-blue/10 text-event-blue border-event-blue/30' });
  }

  return chips;
});

/**
 * One entry per slot of the achievement row, in order. A slot without a resolver - or whose
 * resolver returns `null` because the viewer has not earned it - renders as a placeholder, so
 * the row keeps its shape and a viewer missing one badge does not shift the others left.
 */
const achievementSlots = computed<(ProfileAchievement | null)[]>(() =>
  Array.from({ length: PROFILE_ACHIEVEMENT_SLOT_COUNT }, (_, index) => {
    const resolve = PROFILE_ACHIEVEMENT_SLOTS[index];

    return resolve ? resolve(props.profile) : null;
  }),
);
</script>

<template>
  <WidgetFrame
    variant="blue"
    position-x="200"
  >
    <div class="flex w-96 flex-col gap-y-8 px-1 py-5">
      <div class="flex items-stretch gap-x-2">
        <component
          :is="rankBadge"
          class="w-10 shrink-0"
        />

        <div class="flex min-w-0 flex-1 flex-col justify-between gap-y-1">
          <div class="flex items-baseline justify-between gap-x-2">
            <span
              class="truncate text-lg leading-none font-bold"
              :style="{ color: profile.color }"
            >
              {{ profile.displayName }}
            </span>
            <span
              class="bg-event-amber/20 text-event-amber shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold uppercase"
            >
              lvl {{ profile.lvl }}
            </span>
          </div>

          <span
            class="bg-clip-text text-xs font-semibold tracking-widest text-transparent uppercase"
            :style="{ backgroundImage: rank.gradient }"
          >
            {{ rank.rankTitle }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-x-10">
        <div
          class="border-event-blue/40 bg-event-blue/5 size-32 shrink-0 overflow-hidden rounded-full border-2"
        >
          <HeroPortrait
            v-if="profile.heroId"
            :hero-id="profile.heroId"
            size="size-full"
          />
          <div
            v-else
            class="flex size-full flex-col items-center justify-center"
          >
            <span class="text-event-red/60 text-[9px] tracking-[0.2em] uppercase">hero</span>
            <span class="text-event-red max-w-18 truncate text-xs font-bold">none</span>
          </div>
        </div>

        <div class="flex min-w-0 flex-col gap-y-1.5 text-base">
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">hero lvl:</span>
            <span class="text-event-blue font-bold">{{ profile.heroLevel ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">best streak:</span>
            <span class="text-event-blue font-bold">
              {{ profile.bestStreak ?? '—' }}
            </span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">xp:</span>
            <span class="text-event-blue font-bold">⚡{{ profile.xp }}</span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">coins:</span>
            <span class="text-event-amber font-bold">🪙 {{ profile.coins }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="roleChips.length > 0"
        class="flex flex-wrap gap-1.5"
      >
        <span
          v-for="chip in roleChips"
          :key="chip.label"
          class="flex items-center rounded-md border-2 px-1.5 py-0.5 text-[10px] font-bold uppercase"
          :class="chip.classes"
        >
          {{ chip.label }}
        </span>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="(slot, index) in achievementSlots"
          :key="slot?.key ?? `empty-${index}`"
          class="flex aspect-square items-center justify-center rounded-lg border-2"
          :class="slot ? 'border-transparent' : 'border-event-blue/30 border-dashed'"
        >
          <img
            v-if="slot"
            :src="slot.src"
            :alt="slot.label"
            class="size-full object-contain"
          />
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>
