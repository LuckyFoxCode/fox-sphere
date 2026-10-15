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
 */
import type { ChannelUser } from '@/api/generated/schemas';
import { Badge } from '@/components/ui/badge';

defineProps<{ viewer: ChannelUser }>();

type Flag = readonly [label: string, isSet: boolean];

const flagsFor = (viewer: ChannelUser): string[] => {
  const flags: readonly Flag[] = [
    ['mod', viewer.isMod],
    ['founder', viewer.isFounder],
    ['sub', viewer.isSubscriber],
    ['vip', viewer.isPermanentVip],
    ['ticket', viewer.hasTicket],
    ['lucky vip', viewer.isLuckyVip],
  ];

  return flags.filter(([, isSet]) => isSet).map(([label]) => label);
};
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <Badge
      v-for="flag in flagsFor(viewer)"
      :key="flag"
      variant="secondary"
    >
      {{ flag }}
    </Badge>
  </div>
</template>