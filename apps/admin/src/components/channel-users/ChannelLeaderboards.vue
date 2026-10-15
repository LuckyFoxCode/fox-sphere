<script setup lang="ts">
/**
 * The two top lists for one channel.
 *
 * These live on the channel overview rather than the viewer table. They answer "how is this
 * channel doing", the table answers "who is in it" - and keeping them together on one screen put
 * a leaderboard above the thing you were looking for.
 *
 * Each entry links to that viewer's own page, so a name in a top list is a way in rather than a
 * dead end.
 */
import { useGetChannelLeaderboard } from '@/api/generated/channel-users/channel-users';
import { AsyncState, failureFrom, notFoundFrom } from '@/components/status';
import { RouterLink } from 'vue-router';
import { computed } from 'vue';

const { login, limit = 10 } = defineProps<{ login: string; limit?: number }>();

const {
  data: leaderboard,
  isPending,
  isError,
} = useGetChannelLeaderboard(login, { limit });

const boards = computed(() =>
  leaderboard.value?.status === 200 ? leaderboard.value.data : null,
);
const failure = computed(() => failureFrom(leaderboard.value));
const notFound = computed(() => notFoundFrom(leaderboard.value, 'Channel not found'));

const leaderboards = computed(() => {
  if (!boards.value) return [];

  return [
    { title: 'Top coins', metric: 'coins', entries: boards.value.topCoins },
    { title: 'Top xp', metric: 'xp', entries: boards.value.topXp },
  ] as const;
});
</script>

<template>
  <section class="flex flex-col gap-y-3">
    <AsyncState
      :is-pending="isPending"
      :is-error="isError"
      :failure="failure"
      :not-found="notFound"
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
            <RouterLink
              :to="`/channels/${login}/viewers/${entry.twitchId}`"
              class="hover:underline"
            >
              <span class="text-muted-foreground">{{ index + 1 }}. {{ entry.username }}</span>
            </RouterLink>
            <span>{{ entry[board.metric] }}</span>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>