<script setup lang="ts">
/**
 * Where you are in the channel tree.
 *
 * Replaces the two hand-written "← Back to channels" links, which both pointed at `/channels`
 * and therefore skipped the channel page: from the viewer table, "back" threw away a level rather
 * than stepping out of it. A breadcrumb cannot do that by accident, because every step is a link
 * the reader can see.
 *
 * The last crumb is not a link - it is where you already are, and linking it invites a pointless
 * round trip.
 */
import { ChevronRight } from '@lucide/vue';
import { RouterLink } from 'vue-router';

export type Crumb = { label: string; to?: string };

const { items } = defineProps<{ items: Crumb[] }>();
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="text-muted-foreground flex items-center gap-1.5 text-sm">
      <li
        v-for="(crumb, index) in items"
        :key="crumb.label"
        class="flex items-center gap-1.5"
      >
        <ChevronRight
          v-if="index > 0"
          class="size-3.5 shrink-0"
          aria-hidden="true"
        />
        <RouterLink
          v-if="crumb.to"
          :to="crumb.to"
          class="hover:text-foreground transition-colors"
          >{{ crumb.label }}</RouterLink
        >
        <span
          v-else
          aria-current="page"
          >{{ crumb.label }}</span
        >
      </li>
    </ol>
  </nav>
</template>