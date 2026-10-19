<script setup lang="ts">
/**
 * The flags a viewer actually has.
 *
 * Only what is set. The first version of the panel listed all six as yes/no rows, which meant six
 * identical strings per viewer, five of them saying "no" - so a viewer with a permanent VIP and one
 * with nothing looked the same at a glance. A row of badges reads as the exceptions it is.
 *
 * This is also why nothing here is coloured red for being absent: `hasTicket = false` is "no ticket
 * yet", not a problem, and six red cells per viewer would train the eye to ignore the colour.
 *
 * Each flag carries one shared recipe - a 10% tint behind, a stronger hairline around it, and the
 * label itself in the hue - so the badges differ in meaning without turning the table into the
 * stream overlay. The hues are Twitch vocabulary the operator already reads: emerald mod, violet
 * founder, sky subscriber, pink VIP. `ticket` is amber because it is the one flag that expires
 * weekly, and `lucky vip` spends the lime brand accent, which is the one flag that earns it.
 * Every tone carries its own dark pair: a tint without one is invisible in the dark theme.
 */
import type { ChannelUser } from '@/api/generated/schemas';
import { Badge } from '@/components/ui/badge';

defineProps<{ viewer: ChannelUser }>();

type Flag = {
  readonly label: string;
  readonly isSet: boolean;
  readonly tone: string;
};

const tones = {
  mod: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300',
  founder:
    'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-300',
  sub: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-300',
  vip: 'border-pink-500/40 bg-pink-500/10 text-pink-700 dark:border-pink-400/30 dark:bg-pink-400/15 dark:text-pink-300',
  ticket:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300',
  luckyVip:
    'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:border-lime-400/30 dark:bg-lime-400/15 dark:text-lime-300',
} as const;

const flagsFor = (viewer: ChannelUser): Flag[] => {
  const flags: readonly Flag[] = [
    { label: 'mod', isSet: viewer.isMod, tone: tones.mod },
    { label: 'founder', isSet: viewer.isFounder, tone: tones.founder },
    { label: 'sub', isSet: viewer.isSubscriber, tone: tones.sub },
    { label: 'vip', isSet: viewer.isPermanentVip, tone: tones.vip },
    { label: 'ticket', isSet: viewer.hasTicket, tone: tones.ticket },
    { label: 'lucky vip', isSet: viewer.isLuckyVip, tone: tones.luckyVip },
  ];

  return flags.filter((flag) => flag.isSet);
};
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <Badge
      v-for="flag in flagsFor(viewer)"
      :key="flag.label"
      variant="outline"
      :class="flag.tone"
    >
      {{ flag.label }}
    </Badge>
  </div>
</template>
