<script setup lang="ts">
import { useListChannelUsers } from '@/api/generated/channel-users/channel-users';
import { ChannelUserFlags } from '@/components/channel-users';
import { AsyncState, failureFrom, notFoundFrom } from '@/components/status';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
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

const login = computed(() => String(route.params.login ?? ''));

const perPageOptions = [10, 25, 50, 100];

const page = ref(1);
const perPage = ref(50);

const params = computed(() => ({ page: page.value, perPage: perPage.value }));

const { data, isPending, isError } = useListChannelUsers(login, params);

const list = computed(() => (data.value?.status === 200 ? data.value.data : null));
const failure = computed(() => failureFrom(data.value));
const notFound = computed(() => notFoundFrom(data.value, 'Channel not found'));

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

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <Breadcrumbs
      :items="[
        { label: 'Channels', to: '/channels' },
        { label: login, to: `/channels/${login}` },
        { label: 'Viewers' },
      ]"
    />

    <div>
      <h1 class="text-xl font-semibold">Viewers of {{ login }}</h1>
      <p class="text-muted-foreground text-sm">
        Channel-scoped balances, copied from the legacy tables by the backfill. Read-only, and a
        snapshot — chat still moves the legacy balances until the bot reads these tables itself.
      </p>
    </div>

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
                    <!-- A real link, not a click handler. This used to set a local ref and
                         render a panel further down the page, which changed neither the address
                         nor the history, so it read as a click that did nothing. -->
                    <RouterLink
                      :to="`/channels/${login}/viewers/${viewer.twitchId}`"
                      class="hover:underline"
                    >
                      {{ viewer.username }}
                    </RouterLink>
                    <div class="text-muted-foreground text-xs">{{ viewer.twitchId }}</div>
                  </td>
                  <td class="px-3 py-2">{{ viewer.coins }}</td>
                  <td class="px-3 py-2">{{ viewer.lvl }}</td>
                  <td class="px-3 py-2">{{ viewer.xp }}</td>
                  <td class="px-3 py-2">{{ viewer.xpThisWeek }}</td>
                  <td class="px-3 py-2">{{ viewer.spinsCount }}</td>
                  <td class="px-3 py-2">{{ viewer.totalWin }} / {{ viewer.totalLoss }}</td>
                  <td class="px-3 py-2">
                    <ChannelUserFlags :viewer="viewer" />
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
  </div>
</template>