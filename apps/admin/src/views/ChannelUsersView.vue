<script setup lang="ts">
import {
  useGetChannelLeaderboard,
  useGetChannelUser,
  useListChannelUsers,
} from '@/api/generated/channel-users/channel-users';
import type { ChannelUser } from '@/api/generated/schemas';
import { AsyncState } from '@/components/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const login = computed(() => String(route.params.login));

const perPageOptions = [10, 25, 50, 100];

const page = ref(1);
const perPage = ref(50);

const params = computed(() => ({ page: page.value, perPage: perPage.value }));

const { data, isPending, isError } = useListChannelUsers(login, params);

const {
  data: leaderboard,
  isPending: leaderboardPending,
  isError: leaderboardError,
} = useGetChannelLeaderboard(login, { limit: 10 });

const selectedTwitchId = ref<string | null>(null);

// The generated hook enables on any non-null twitchId, so the empty string would
// fetch `/viewers/` for a viewer that was never picked. `enabled` is spread last
// in the generated options object, which is what makes this override stick.
const {
  data: detail,
  isPending: detailPending,
  isError: detailError,
} = useGetChannelUser(
  login,
  computed(() => selectedTwitchId.value ?? ''),
  { query: { enabled: computed(() => selectedTwitchId.value !== null) } },
);

type StatusResponse = { status: number; data?: unknown };

// One builder for all three queries: 200 renders, a 404 is its own branch, and
// any status the spec never documented has to surface rather than render as empty.
const failureFrom = (response: StatusResponse | undefined): string | null => {
  if (!response || response.status === 200 || response.status === 404) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
};

const notFoundFrom = (response: StatusResponse | undefined, message: string): string | undefined =>
  response?.status === 404 ? message : undefined;

const list = computed(() => (data.value?.status === 200 ? data.value.data : null));
const failure = computed(() => failureFrom(data.value));
const notFound = computed(() => notFoundFrom(data.value, 'Channel not found'));

const boards = computed(() => (leaderboard.value?.status === 200 ? leaderboard.value.data : null));
const leaderboardFailure = computed(() => failureFrom(leaderboard.value));
const leaderboardNotFound = computed(() => notFoundFrom(leaderboard.value, 'Channel not found'));

const detailViewer = computed(() => (detail.value?.status === 200 ? detail.value.data : null));
const detailFailure = computed(() => failureFrom(detail.value));
const detailNotFound = computed(() => notFoundFrom(detail.value, 'Channel user not found'));

const total = computed(() => list.value?.total ?? 0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)));
const canGoPrevious = computed(() => page.value > 1);
const canGoNext = computed(() => page.value < pageCount.value);

// `:disabled` is the only bound; a disabled button fires nothing, so the handlers
// stay plain and the page index cannot walk past either end.
const goPrevious = () => {
  page.value -= 1;
};
const goNext = () => {
  page.value += 1;
};
const setPerPage = (value: unknown) => {
  perPage.value = Number(value);
  page.value = 1;
};

const selectViewer = (viewer: ChannelUser) => {
  selectedTwitchId.value = viewer.twitchId;
};
const clearSelection = () => {
  selectedTwitchId.value = null;
};

const yesNo = (flag: boolean) => (flag ? 'yes' : 'no');

type Flag = readonly [label: string, isSet: boolean];

// Badges for what is set only, so a row reads as a list of exceptions.
const flagsOf = (viewer: ChannelUser): string[] => {
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

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const fieldsOf = (viewer: ChannelUser) => [
  { label: 'Username', value: viewer.username },
  { label: 'Twitch id', value: viewer.twitchId },
  { label: 'Coins', value: viewer.coins },
  { label: 'Level', value: viewer.lvl },
  { label: 'XP', value: viewer.xp },
  { label: 'XP this week', value: viewer.xpThisWeek },
  { label: 'Spins', value: viewer.spinsCount },
  { label: 'Wins', value: viewer.totalWin },
  { label: 'Losses', value: viewer.totalLoss },
  { label: 'Last xp', value: formatDate(viewer.lastXpAt) },
  { label: 'Mod', value: yesNo(viewer.isMod) },
  { label: 'Founder', value: yesNo(viewer.isFounder) },
  { label: 'Subscriber', value: yesNo(viewer.isSubscriber) },
  { label: 'Permanent vip', value: yesNo(viewer.isPermanentVip) },
  { label: 'Ticket', value: yesNo(viewer.hasTicket) },
  { label: 'Lucky vip', value: yesNo(viewer.isLuckyVip) },
];

const leaderboards = computed(() => {
  if (!boards.value) return [];

  return [
    { title: 'Top coins', metric: 'coins', entries: boards.value.topCoins },
    { title: 'Top xp', metric: 'xp', entries: boards.value.topXp },
  ] as const;
});
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <RouterLink
      to="/channels"
      class="text-muted-foreground hover:text-foreground text-sm"
    >
      ← Back to channels
    </RouterLink>

    <div>
      <h1 class="text-xl font-semibold">Viewers of {{ login }}</h1>
      <p class="text-muted-foreground text-sm">
        Channel-scoped balances, copied from the legacy tables by the backfill. Read-only, and a
        snapshot — chat still moves the legacy balances until the bot reads these tables itself.
      </p>
    </div>

    <section class="flex flex-col gap-y-3">
      <AsyncState
        :is-pending="leaderboardPending"
        :is-error="leaderboardError"
        :failure="leaderboardFailure"
        :not-found="leaderboardNotFound"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="board in leaderboards"
          :key="board.title"
          class="bg-card rounded-xl border p-4"
        >
          <h2 class="mb-3 font-medium">{{ board.title }}</h2>
          <p
            v-if="board.entries.length === 0"
            class="text-muted-foreground text-sm"
          >
            No viewers yet
          </p>
          <ol
            v-else
            class="flex flex-col gap-y-1 text-sm"
          >
            <li
              v-for="(entry, index) in board.entries"
              :key="entry.twitchId"
              class="flex justify-between gap-4"
            >
              <span class="text-muted-foreground">{{ index + 1 }}. {{ entry.username }}</span>
              <span>{{ entry[board.metric] }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-y-3">
      <AsyncState
        :is-pending="isPending"
        :is-error="isError"
        :failure="failure"
        :not-found="notFound"
      />

      <template v-if="list">
        <p
          v-if="list.items.length === 0"
          class="text-muted-foreground py-8 text-center text-sm"
        >
          No viewers yet for this channel.
        </p>

        <template v-else>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-border border-b text-left">
                  <th class="px-3 py-2 font-medium">Viewer</th>
                  <th class="px-3 py-2 font-medium">Coins</th>
                  <th class="px-3 py-2 font-medium">Level</th>
                  <th class="px-3 py-2 font-medium">XP</th>
                  <th class="px-3 py-2 font-medium">XP this week</th>
                  <th class="px-3 py-2 font-medium">Spins</th>
                  <th class="px-3 py-2 font-medium">W / L</th>
                  <th class="px-3 py-2 font-medium">Flags</th>
                  <th class="px-3 py-2 font-medium">Last xp</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="viewer in list.items"
                  :key="viewer.twitchId"
                  class="border-border hover:bg-accent/50 border-b transition-colors"
                >
                  <td class="px-3 py-2">
                    <button
                      type="button"
                      class="hover:underline"
                      @click="() => selectViewer(viewer)"
                    >
                      {{ viewer.username }}
                    </button>
                    <div class="text-muted-foreground text-xs">{{ viewer.twitchId }}</div>
                  </td>
                  <td class="px-3 py-2">{{ viewer.coins }}</td>
                  <td class="px-3 py-2">{{ viewer.lvl }}</td>
                  <td class="px-3 py-2">{{ viewer.xp }}</td>
                  <td class="px-3 py-2">{{ viewer.xpThisWeek }}</td>
                  <td class="px-3 py-2">{{ viewer.spinsCount }}</td>
                  <td class="px-3 py-2">{{ viewer.totalWin }} / {{ viewer.totalLoss }}</td>
                  <td class="px-3 py-2">
                    <Badge
                      v-for="flag in flagsOf(viewer)"
                      :key="flag"
                      variant="secondary"
                    >
                      {{ flag }}
                    </Badge>
                  </td>
                  <td class="px-3 py-2">{{ formatDate(viewer.lastXpAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between gap-x-4">
            <p class="text-muted-foreground text-sm">
              {{ total }} {{ total === 1 ? 'viewer' : 'viewers' }} · page {{ page }} of
              {{ pageCount }}
            </p>

            <div class="flex items-center gap-x-2">
              <span class="text-muted-foreground text-sm">Per page</span>
              <Select
                :model-value="String(perPage)"
                @update:model-value="setPerPage"
              >
                <SelectTrigger class="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in perPageOptions"
                    :key="option"
                    :value="String(option)"
                  >
                    {{ option }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer"
                :disabled="!canGoPrevious"
                @click="goPrevious"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="cursor-pointer"
                :disabled="!canGoNext"
                @click="goNext"
              >
                Next
              </Button>
            </div>
          </div>
        </template>
      </template>
    </section>

    <section
      v-if="selectedTwitchId"
      class="bg-card rounded-xl border p-4"
    >
      <div class="mb-3 flex items-center justify-between gap-x-4">
        <h2 class="font-medium">Viewer detail</h2>
        <Button
          variant="ghost"
          size="sm"
          class="cursor-pointer"
          @click="clearSelection"
        >
          Close
        </Button>
      </div>

      <AsyncState
        :is-pending="detailPending"
        :is-error="detailError"
        :failure="detailFailure"
        :not-found="detailNotFound"
      />

      <dl
        v-if="detailViewer"
        class="grid gap-x-8 gap-y-2 sm:grid-cols-2"
      >
        <div
          v-for="field in fieldsOf(detailViewer)"
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
