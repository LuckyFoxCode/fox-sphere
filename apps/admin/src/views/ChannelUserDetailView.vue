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

const yesNo = (flag: boolean) => (flag ? 'yes' : 'no');

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

// The route param is what was asked for; the response carries the name they go by. Until it
// arrives the crumb shows the id, so the trail is never blank.
const viewerLabel = computed(() => viewer.value?.username ?? twitchId.value);

const fields = computed(() => {
  const found = viewer.value;

  if (!found) return [];

  return [
    { label: 'Username', value: found.username },
    { label: 'Twitch id', value: found.twitchId },
    { label: 'Coins', value: found.coins },
    { label: 'Level', value: found.lvl },
    { label: 'XP', value: found.xp },
    { label: 'XP this week', value: found.xpThisWeek },
    { label: 'Spins', value: found.spinsCount },
    { label: 'Wins', value: found.totalWin },
    { label: 'Losses', value: found.totalLoss },
    { label: 'Last xp', value: formatDate(found.lastXpAt) },
    { label: 'Mod', value: yesNo(found.isMod) },
    { label: 'Founder', value: yesNo(found.isFounder) },
    { label: 'Subscriber', value: yesNo(found.isSubscriber) },
    { label: 'Permanent vip', value: yesNo(found.isPermanentVip) },
    { label: 'Ticket', value: yesNo(found.hasTicket) },
    { label: 'Lucky vip', value: yesNo(found.isLuckyVip) },
  ];
});
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
        Every balance the bot keeps for this viewer in this channel.
      </p>
    </div>

    <section class="bg-card rounded-xl border p-4">
      <AsyncState
        :is-pending="isPending"
        :is-error="isError"
        :failure="failure"
        :not-found="notFound"
      />

      <dl
        v-if="viewer"
        class="grid gap-x-8 gap-y-2 sm:grid-cols-2"
      >
        <div
          v-for="field in fields"
          :key="field.label"
          class="flex justify-between gap-4"
        >
          <dt class="text-muted-foreground">{{ field.label }}</dt>
          <dd>{{ field.value }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>