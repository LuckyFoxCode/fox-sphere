<script setup lang="ts">
import { useGetChannelById } from '@/api/generated/channels/channels';
import { statusVariant } from '@/components/channels';
import { Badge } from '@/components/ui/badge';
import { AsyncState } from '@/components/status';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const channelId = computed(() => String(route.params.id));

const { data, isPending, isError } = useGetChannelById(channelId);

const channel = computed(() => (data.value?.status === 200 ? data.value.data : null));
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

    <AsyncState
      :is-pending="isPending"
      :is-error="isError"
      :failure="failure"
      not-found="Channel not found"
    />
    <dl
      v-if="channel"
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
  </div>
</template>
