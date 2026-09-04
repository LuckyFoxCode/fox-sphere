<script setup lang="ts">
import { useListChannels } from '@/api/generated/channels/channels';
import { ChannelCreateForm, ChannelList } from '@/components/channels';
import { computed } from 'vue';

const { data, isPending, isError, refetch } = useListChannels();

const channels = computed(() => (data.value?.status === 200 ? data.value.data : []));

const failure = computed(() => {
  const response = data.value;

  if (!response || response.status === 200) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
});
</script>

<template>
  <div class="flex flex-col gap-y-8">
    <section>
      <h1 class="mb-4 text-xl font-semibold">Channels</h1>

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
      <ChannelList
        v-else-if="data?.status === 200"
        :channels="channels"
      />
      <!-- No branch may be silently false: an unhandled shape must still say something. -->
      <p
        v-else
        class="text-destructive text-sm"
      >
        Unexpected response from the api
      </p>
    </section>

    <ChannelCreateForm :on-created="refetch" />
  </div>
</template>
