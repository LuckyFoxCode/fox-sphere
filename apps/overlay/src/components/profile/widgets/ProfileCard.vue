<script setup lang="ts">
import { IconLightning } from '@/assets/icons';
import { LevelBadge } from '@/components/stream';
import { HeroPortrait, PaperFrame } from '@/components/ui';
import {
  CHAT_ROLE_STYLES,
  getRankConfigByLevel,
  MAX_ICON_TIER,
  RANK_BADGES,
  resolveChatRole,
  resolveProfileAchievementSlots,
  type ChatRole,
} from '@/constants';
import { getHeroById, getHeroStats } from '@/utils/hero';
import type { HeroStats, ProfileShowPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ profile: ProfileShowPayload }>();

/**
 * The card is paper, not graphite: it is *content* about one viewer, so it borrows the chat
 * message's anatomy - a dark strip of the person's role over a light body - rather than the
 * HUD's die-cut sticker. `PaperFrame` owns the material (oat keyline, grain, offset shadow);
 * this file owns nothing but arrangement.
 */

/**
 * The broadcaster tag overrides the level: `getRankConfigByLevel` answers `GAME MASTER` for the
 * streamer before it looks at `lvl`. There is no bot flag in the payload, so `SYSTEM BOT` stays
 * in chat and the hero lane. Tier 10 (`OVERLORD`) is drawn with the ninth badge on purpose,
 * same as `ChatMessageItem`.
 */
const rank = computed(() => getRankConfigByLevel(props.profile.lvl, props.profile.isBroadcaster));

/** The rank badge beside the title; `LevelBadge` on the other side carries the level number. */
const rankBadge = computed(() => RANK_BADGES[Math.min(rank.value.tier, MAX_ICON_TIER)]);

/**
 * One role per card, resolved by the chat's own table so the strip cannot claim a role the
 * message list would not. `ChatRoleFlags` also wants `isBot` and `isFollower`, which the profile
 * payload does not carry - a viewer who never chatted has no follow row to read - so both are
 * passed as `false` rather than guessed. `isPermanentVip` is the chat's `isVip`: the temporary
 * subscription VIP does not exist in this payload.
 */
const role = computed<ChatRole>(() =>
  resolveChatRole({
    isBroadcaster: props.profile.isBroadcaster,
    isBot: false,
    isMod: props.profile.isMod,
    isVip: props.profile.isPermanentVip,
    isPermanentVip: props.profile.isPermanentVip,
    isSubscriber: props.profile.isSubscriber,
    isFollower: false,
  }),
);

const roleStyle = computed(() => CHAT_ROLE_STYLES[role.value]);

const hero = computed(() => (props.profile.heroId ? getHeroById(props.profile.heroId) : null));

const heroLine = computed(() =>
  hero.value
    ? `${hero.value.name} · hero lvl ${props.profile.heroLevel ?? 1}`
    : 'no hero assigned yet',
);

const HERO_STAT_LABELS = [
  { key: 'health', label: 'hp' },
  { key: 'attack', label: 'atk' },
  { key: 'defense', label: 'def' },
  { key: 'speed', label: 'spd' },
] as const satisfies readonly { key: keyof HeroStats; label: string }[];

/**
 * The hero's numbers at the level the viewer actually has, not the level-1 catalogue entry:
 * `getHeroStats` already owns the growth curve, so a level 7 assassin reads 154 hp rather than
 * the shop's 100. Fractional growth is rounded here - a card is a reading, not a battle
 * preview, and `19.2` in a 40px tile reads as a mistake.
 */
const heroStats = computed(() => {
  const stats = hero.value ? getHeroStats(hero.value.id, props.profile.heroLevel ?? 1) : null;

  return HERO_STAT_LABELS.map((stat) => ({
    ...stat,
    value: stats ? `${Math.round(stats[stat.key])}` : '—',
  }));
});

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

const XP_CELL_COUNT = 40;

/** Flat cells, never a glowing pill: the last filled cell is mint, the rest rose. */
const XP_CELL_CLASSES = {
  lead: 'bg-sticker-mint',
  filled: 'bg-sticker-rose',
  empty: 'bg-text-inverse/15',
} as const;

const xpCells = computed(() => {
  const filled = Math.floor((xpProgress.value / 100) * XP_CELL_COUNT);

  return Array.from({ length: XP_CELL_COUNT }, (_, index) => {
    if (index >= filled) return XP_CELL_CLASSES.empty;
    if (index === filled - 1) return XP_CELL_CLASSES.lead;

    return XP_CELL_CLASSES.filled;
  });
});

const xpFigures = computed(
  () => `${formatNumber(props.profile.xp)} / ${formatNumber(props.profile.maxXp)}`,
);

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** One tile under the hero. A new number is one entry here, not a block of markup. */
interface ProfileStat {
  key: string;
  label: string;
  value: string;
}

const numbers = computed<ProfileStat[]>(() => [
  { key: 'coins', label: 'coins', value: formatNumber(props.profile.coins) },
  {
    key: 'best-streak',
    label: 'best streak',
    value: `${props.profile.bestStreak ?? '—'}`,
  },
  { key: 'golden', label: 'golden', value: `${props.profile.goldenBeers}` },
]);

/**
 * Every flag the viewer carries, not just the resolved one: `founder` and `lucky vip` have no
 * chat role of their own, so `resolveChatRole` never answers them. The chip of the role the
 * strip is coloured with takes the chat's own chip classes and is the only dark chip on the
 * card; the rest stay neutral, because a birthday cake of colours is what the paper replaced.
 */
interface RoleFlagDefinition {
  key: string;
  label: string;
  /** The chat role this flag *is*, when it is one. `null` never wins the highlighted chip. */
  role: ChatRole | null;
  has: (profile: ProfileShowPayload) => boolean;
}

const ROLE_FLAGS: readonly RoleFlagDefinition[] = [
  { key: 'founder', label: 'founder', role: null, has: (profile) => profile.isFounder },
  { key: 'mod', label: 'mod', role: 'mod', has: (profile) => profile.isMod },
  { key: 'vip', label: 'vip', role: 'vip', has: (profile) => profile.isPermanentVip },
  { key: 'lucky-vip', label: 'lucky vip', role: null, has: (profile) => profile.isLuckyVip },
  { key: 'sub', label: 'sub', role: 'sub', has: (profile) => profile.isSubscriber },
];

const NEUTRAL_CHIP = 'border-text-inverse/20 bg-white/55 text-text-inverse/65';

const roleFlags = computed(() =>
  ROLE_FLAGS.filter((flag) => flag.has(props.profile)).map((flag) => ({
    key: flag.key,
    label: flag.label,
    classes: flag.role === role.value ? roleStyle.value.chip : NEUTRAL_CHIP,
  })),
);

/**
 * Earned badges packed to the left, then placeholders - see `resolveProfileAchievementSlots`.
 * A viewer without a watch streak shows their beer badge in the first cell instead of an empty
 * one, and the row keeps its length.
 */
const achievementSlots = computed(() => resolveProfileAchievementSlots(props.profile));
</script>

<template>
  <PaperFrame
    class="text-text-inverse w-96 bg-linear-to-b"
    :class="roleStyle.body"
  >
    <!-- Шапка повторяет шапку сообщения в чате: тот же градиент роли и та же тёмная
         подложка под медаль. Цвет роли звучит здесь один раз и больше нигде. -->
    <div
      class="flex items-center gap-x-2.5 border-b-2 border-slate-800 bg-linear-to-r px-3 py-2"
      :class="roleStyle.header"
    >
      <component
        :is="rankBadge"
        class="size-8.5 shrink-0"
      />

      <span
        class="min-w-0 flex-1 truncate bg-clip-text text-xs leading-none font-extrabold tracking-[0.2em] text-transparent uppercase"
        :style="{ backgroundImage: rank.gradient }"
      >
        {{ rank.rankTitle }}
      </span>

      <LevelBadge
        :level="profile.lvl"
        :is-broadcaster="profile.isBroadcaster"
        :size="40"
        class="shrink-0"
      />
    </div>

    <div class="flex flex-col gap-y-3 px-3 pt-3 pb-3.5">
      <div class="flex items-center gap-x-3">
        <div
          class="size-23 shrink-0 overflow-hidden rounded-full border-2 bg-white/55"
          :class="roleStyle.frame"
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
            <span class="text-[9px] font-bold tracking-[0.2em] uppercase opacity-45">hero</span>
            <span class="text-xs font-bold opacity-70">none</span>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-y-1">
          <span
            class="truncate text-lg leading-none font-extrabold"
            :style="{ color: profile.color }"
          >
            {{ profile.displayName }}
          </span>

          <span class="truncate text-[11px] leading-none font-semibold opacity-60">
            {{ heroLine }}
          </span>

          <div
            v-if="roleFlags.length > 0"
            class="flex flex-wrap gap-1"
          >
            <span
              v-for="flag in roleFlags"
              :key="flag.key"
              class="rounded-md border-2 px-1.5 pt-0.5 pb-px text-[9px] leading-none font-bold tracking-[0.08em] uppercase"
              :class="flag.classes"
            >
              {{ flag.label }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-y-1">
        <div class="flex items-baseline justify-between">
          <span
            class="flex items-center gap-x-1 text-[9.5px] font-bold tracking-[0.17em] uppercase opacity-55"
          >
            <IconLightning
              aria-hidden="true"
              class="size-3"
            />
            xp
          </span>

          <span class="text-[11px] leading-none font-bold tabular-nums">
            {{ xpFigures }}
          </span>
        </div>

        <div
          class="flex h-2 w-full items-center gap-0.5"
          role="progressbar"
          :aria-valuenow="Math.round(xpProgress)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${profile.displayName} xp`"
        >
          <span
            v-for="(cell, index) in xpCells"
            :key="index"
            class="h-full flex-1 rounded-xs transition-colors duration-700 ease-out"
            :class="cell"
          />
        </div>
      </div>

      <div class="grid grid-cols-4 gap-1.5">
        <div
          v-for="stat in heroStats"
          :key="stat.key"
          :data-stat="stat.key"
          class="flex flex-col items-center gap-y-0.5 rounded-lg border-2 border-white/70 bg-white/55 py-1"
        >
          <span class="text-[9px] font-bold tracking-[0.17em] uppercase opacity-50">
            {{ stat.label }}
          </span>
          <span class="text-sm leading-none font-bold tabular-nums">{{ stat.value }}</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="stat in numbers"
          :key="stat.key"
          class="flex flex-col items-center gap-y-0.5 rounded-lg border-2 border-white/70 bg-white/55 py-1"
        >
          <span class="text-[9px] font-bold tracking-[0.17em] uppercase opacity-50">
            {{ stat.label }}
          </span>
          <span class="text-sm leading-none font-bold tabular-nums">{{ stat.value }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-y-1.5">
        <span class="text-[9.5px] font-bold tracking-[0.17em] uppercase opacity-55">
          achievements
        </span>

        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="(slot, index) in achievementSlots"
            :key="slot?.key ?? `empty-${index}`"
            class="flex aspect-square items-center justify-center rounded-lg border-2"
            :class="
              slot ? 'border-transparent bg-white/35' : 'border-text-inverse/20 border-dashed'
            "
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
  </PaperFrame>
</template>
