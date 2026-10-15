<script setup lang="ts">
/**
 * One viewer, on a route of its own.
 *
 * This was a panel that appeared at the bottom of the table when you clicked a row. Nothing in
 * the page changed - no address, no history entry - so it read as a click that did nothing,
 * and on a long table the panel could sit below the fold entirely. The route makes the transition
 * real: the address changes, Back returns to the table, and a link to one viewer can be kept.
 *
 * The endpoint and its generated hook already existed for the old panel, so this screen is pure
 * navigation. It is also the obvious place to grow: history rows, achievements, whatever a
 * viewer ends up accumulating.
 */
import { useGetChannelUser } from '@/api/generated/channel-users/channel-users';
import { ChannelUserFlags } from '@/components/channel-users';
import { AsyncState, failureFrom, notFoundFrom } from '@/components/status';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();

const login = computed(() => String(route.params.login ?? ''));
const twitchId = computed(() => String(route.params.twitchId ?? ''));

const { data: detail, isPending, isError } = useGetChannelUser(login, twitchId);

const viewer = computed(() => (detail.value?.status === 200 ? detail.value.data : null));
const failure = computed(() => failureFrom(detail.value));
const notFound = computed(() => notFoundFrom(detail.value, 'Channel user not found'));

// 'en-US' so the grouping is the same wherever the panel runs - the rest of this UI is English,
// and a number that reads "4200" on one machine and "4 200" on another makes a diff between two
// screenshots meaningless. The bot is the only thing that gets a locale.
const formatNumber = (value: number): string => value.toLocaleString('en-US');

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

// Wins as a share of spins, which is the one number here that answers "is this viewer winning".
// A viewer who has never spun has no rate, and "NaN%" would say less than a dash.
const winRate = computed(() => {
  const found = viewer.value;

  if (!found) return null;

  const played = found.totalWin + found.totalLoss;

  return played === 0 ? null : `${Math.round((found.totalWin / played) * 100)}%`;
});

type Field = readonly [label: string, value: string | number];

const progressFields = computed<Field[]>(() => {
  const found = viewer.value;

  return found
    ? [
        ['Level', found.lvl],
        ['XP', formatNumber(found.xp)],
        ['XP this week', formatNumber(found.xpThisWeek)],
      ]
    : [];
});

const economyFields = computed<Field[]>(() => {
  const found = viewer.value;

  return found
    ? [
        ['Coins', formatNumber(found.coins)],
        ['Spins', formatNumber(found.spinsCount)],
        ['Wins / losses', `${formatNumber(found.totalWin)} / ${formatNumber(found.totalLoss)}`],
        ['Win rate', winRate.value ?? '—'],
      ]
    : [];
});
// The route param is what was asked for; the response carries the name they go by. Until it
// arrives the crumb shows the id, so the trail is never blank.
const viewerLabel = computed(() => viewer.value?.username ?? twitchId.value);
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <Breadcrumbs
      :items="[
        { label: 'Channels', to: '/channels' },
        { label: login, to: `/channels/${login}` },
        { label: 'Viewers', to: `/channels/${login}/viewers` },
        { label: viewerLabel },
      ]"
    />

    <div>
      <h1 class="text-xl font-semibold">{{ viewerLabel }}</h1>
      <p class="text-muted-foreground text-sm">
        {{ twitchId }} · last xp {{ viewer ? formatDate(viewer.lastXpAt) : '—' }}
      </p>
    </div>

    <section class="bg-card rounded-xl border p-4">
      <AsyncState
        :is-pending="isPending"
        :is-error="isError"
        :failure="failure"
        :not-found="notFound"
      />

      <div
        v-if="viewer"
        class="flex flex-col gap-y-6"
      >
        <!-- Grouped by what a reader is asking, not by what the API returns. Sixteen rows in one
             column is a data dump; three named blocks are three questions answered. -->
        <div class="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Progress
            </h2>
            <dl class="flex flex-col gap-y-1 text-sm">
              <div
                v-for="[label, value] in progressFields"
                :key="label"
                class="flex justify-between gap-4"
              >
                <dt class="text-muted-foreground">{{ label }}</dt>
                <dd class="font-medium">{{ value }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Economy
            </h2>
            <dl class="flex flex-col gap-y-1 text-sm">
              <div
                v-for="[label, value] in economyFields"
                :key="label"
                class="flex justify-between gap-4"
              >
                <dt class="text-muted-foreground">{{ label }}</dt>
                <dd class="font-medium">{{ value }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <h2 class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Status
          </h2>
          <ChannelUserFlags :viewer="viewer" />
        </div>
      </div>
    </section>
  </div>
</template>