<script setup lang="ts">
import { useListChannels } from '@/api/generated/channels/channels';
import { ChannelCreateForm, ChannelList } from '@/components/channels';
import { AsyncState } from '@/components/status';
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

      <AsyncState
        :is-pending="isPending"
        :is-error="isError"
        :failure="failure"
      />
      <ChannelList
        v-if="data?.status === 200"
        :channels="channels"
      />
    </section>

    <ChannelCreateForm :on-created="refetch" />
  </div>
</template>
