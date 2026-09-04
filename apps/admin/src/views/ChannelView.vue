<script setup lang="ts">
import { useGetChannelById } from '@/api/generated/channels/channels';
import { statusVariant } from '@/components/channels';
import { Badge } from '@/components/ui/badge';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const channelId = computed(() => String(route.params.id));

const { data, isPending, isError } = useGetChannelById(channelId);

const channel = computed(() => (data.value?.status === 200 ? data.value.data : null));
const notFound = computed(() => data.value?.status === 404);
const failure = computed(() => {
  const response = data.value;

  if (!response || response.status === 200 || response.status === 404) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
});
</script>

<template>
  <div>
    <RouterLink
      to="/channels"
      class="text-muted-foreground hover:text-foreground text-sm"
    >
      ← Back to channels
    </RouterLink>

    <p v-if="isPending">Loading...</p>
    <p
      v-else-if="isError"
      class="text-destructive text-sm"
    >
      Could not reach the api - is it running on :3001?
    </p>
    <p
      v-else-if="failure"
      class="text-destructive text-sm"
    >
      {{ failure }}
    </p>
    <p
      v-else-if="notFound"
      class="text-sm text-amber-400"
    >
      Channel not found
    </p>
    <dl
      v-else-if="channel"
      class="bg-card divide-border max-w-md divide-y rounded-xl border"
    >
      <div class="flex justify-between gap-4 px-4 py-2.5">
        <dt class="text-muted-foreground">Login</dt>
        <dd>{{ channel.login }}</dd>
      </div>
      <div class="flex justify-between gap-4 px-4 py-2.5">
        <dt class="text-muted-foreground">Display name</dt>
        <dd>{{ channel.displayName }}</dd>
      </div>
      <div class="flex justify-between gap-4 px-4 py-2.5">
        <dt class="text-muted-foreground">Twitch id</dt>
        <dd>{{ channel.twitchId }}</dd>
      </div>
      <div class="flex justify-between gap-4 px-4 py-2.5">
        <dt class="text-muted-foreground">Status</dt>
        <dd>
          <Badge :variant="statusVariant[channel.status]">{{ channel.status }}</Badge>
        </dd>
      </div>
      <div class="flex justify-between gap-4 px-4 py-2.5">
        <dt class="text-muted-foreground">Bot is mod</dt>
        <dd>{{ channel.botIsMod ? 'yes' : 'no' }}</dd>
      </div>
    </dl>
    <!-- No branch may be silently false: an unhandled shape must still say something. -->
    <p
      v-else
      class="text-destructive text-sm"
    >
      Unexpected response from the api
    </p>
  </div>
</template>
