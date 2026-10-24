<script setup lang="ts">
import { LevelBadge } from '@/components/stream';
import { HeroPortrait } from '@/components/ui';
import { WidgetFrame } from '@/components/ui/widget-frame';
import {
  getRankConfigByLevel,
  MAX_ICON_TIER,
  RANK_BADGES,
  resolveProfileAchievementSlots,
} from '@/constants';
import type { ProfileShowPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ profile: ProfileShowPayload }>();

/**
 * The broadcaster tag overrides the level: `getRankConfigByLevel` answers `GAME MASTER` for the
 * streamer before it looks at `lvl`. There is no bot flag in the payload, so `SYSTEM BOT` stays
 * in chat and the hero lane. Tier 10 (`OVERLORD`) is drawn with the ninth badge on purpose,
 * same as `ChatMessageItem`.
 *
 * The level itself is drawn by `LevelBadge` - the same ring the stream widget uses - and
 * `isBroadcaster` is passed through so the ring matches this title instead of the raw level.
 */
const rank = computed(() => getRankConfigByLevel(props.profile.lvl, props.profile.isBroadcaster));

/** The rank badge beside the name; `LevelBadge` on the other side carries the level number. */
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

/** One tile under the hero. A new number is one entry here, not a block of markup. */
interface ProfileStat {
  key: string;
  label: string;
  value: string;
  classes: string;
}

const stats = computed<ProfileStat[]>(() => [
  {
    key: 'hero-level',
    label: 'hero lvl',
    value: `${props.profile.heroLevel ?? '—'}`,
    classes: 'text-event-blue',
  },
  {
    key: 'best-streak',
    label: 'best streak',
    value: `${props.profile.bestStreak ?? '—'}`,
    classes: 'text-event-blue',
  },
  {
    key: 'coins',
    label: 'coins',
    value: `🪙 ${props.profile.coins}`,
    classes: 'text-event-amber',
  },
]);

/**
 * The bar spans exactly one level: `startXp` and `maxXp` are the cumulative thresholds the bot
 * sends, and `xp` is cumulative too, so the fill is the distance travelled between them. Clamped
 * because a level is only raised on the next message, so `xp` can sit past `maxXp` for a moment.
 */
const xpProgress = computed(() => {
  const range = props.profile.maxXp - props.profile.startXp;

  if (range <= 0) return 0;

  const percentage = ((props.profile.xp - props.profile.startXp) / range) * 100;

  return Math.min(Math.max(percentage, 0), 100);
});

/**
 * Earned badges packed to the left, then placeholders - see `resolveProfileAchievementSlots`.
 * A viewer without a watch streak shows their beer badge in the first cell instead of an empty
 * one, and the row keeps its length.
 */
const achievementSlots = computed(() => resolveProfileAchievementSlots(props.profile));
</script>

<template>
  <WidgetFrame
    variant="blue"
    position-x="200"
  >
    <div class="flex w-96 flex-col gap-y-6 px-1 py-5">
      <div class="flex items-center gap-x-2">
        <component
          :is="rankBadge"
          class="size-10 shrink-0"
        />

        <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
          <span
            class="truncate text-lg leading-none font-bold"
            :style="{ color: profile.color }"
          >
            {{ profile.displayName }}
          </span>

          <span
            class="bg-clip-text text-xs font-semibold tracking-widest text-transparent uppercase"
            :style="{ backgroundImage: rank.gradient }"
          >
            {{ rank.rankTitle }}
          </span>
        </div>

        <LevelBadge
          :level="profile.lvl"
          :is-broadcaster="profile.isBroadcaster"
          class="shrink-0"
        />
      </div>

      <div class="flex flex-col items-center gap-y-3">
        <div
          class="border-event-blue/40 bg-event-blue/5 size-44 shrink-0 overflow-hidden rounded-full border-2"
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

        <div class="flex w-full items-center gap-x-2">
          <span class="text-event-blue w-12 shrink-0 text-right text-xs font-bold">
            ⚡{{ profile.xp }}
          </span>

          <div
            class="border-event-blue/40 bg-event-blue/10 h-3 flex-1 overflow-hidden rounded-full border-2"
            role="progressbar"
            :aria-valuenow="Math.round(xpProgress)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="bg-event-blue h-full rounded-full transition-[width] duration-700 ease-out"
              :style="{ width: `${xpProgress}%` }"
            />
          </div>

          <span class="text-text-second w-12 shrink-0 text-xs font-bold">
            {{ profile.maxXp }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-y-2">
        <span class="text-text-second text-[10px] font-bold tracking-widest uppercase">stats</span>

        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="stat in stats"
            :key="stat.key"
            class="bg-event-blue/5 flex flex-col items-center gap-y-0.5 rounded-lg py-1.5"
          >
            <span class="text-text-second text-[9px] font-bold tracking-widest uppercase">
              {{ stat.label }}
            </span>
            <span
              class="text-base font-bold"
              :class="stat.classes"
            >
              {{ stat.value }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="roleChips.length > 0"
        class="flex flex-col gap-y-2"
      >
        <span class="text-text-second text-[10px] font-bold tracking-widest uppercase">status</span>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="chip in roleChips"
            :key="chip.label"
            class="flex items-center rounded-md border-2 px-1.5 py-0.5 text-[10px] font-bold uppercase"
            :class="chip.classes"
          >
            {{ chip.label }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-y-2">
        <span class="text-text-second text-[10px] font-bold tracking-widest uppercase">
          achievements
        </span>

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
    </div>
  </WidgetFrame>
</template>
