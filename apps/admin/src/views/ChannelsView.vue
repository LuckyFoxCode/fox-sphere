<script setup lang="ts">
import { useListChannels } from '@/api/generated/channels/channels';
import { ChannelCreateForm, ChannelList } from '@/components/channels';
import { AsyncState } from '@/components/status';
import { Button } from '@/components/ui/button';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';

const { data, isPending, isError, refetch } = useListChannels();

const channels = computed(() => (data.value?.status === 200 ? data.value.data : []));

// Creating a channel is a one-off, not something done while watching the list, so the form
// starts closed and the button is the affordance. It does not open itself on an empty list:
// the toggle then has one rule instead of one rule plus an exception.
const isFormOpen = ref(false);

const { toastSuccess } = useToast();

const handleCreated = () => {
  toastSuccess('Channel added');
  isFormOpen.value = false;
  refetch();
};

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
      <div class="mb-4 flex items-center justify-between gap-4">
        <h1 class="text-xl font-semibold">Channels</h1>

        <!-- Reads "Cancel" while open rather than leaving two buttons both saying "Add channel"
             on screen at once, which is what a one-way toggle would produce. -->
        <Button
          variant="outline"
          size="sm"
          :aria-expanded="isFormOpen"
          aria-controls="channel-create-form"
          @click="isFormOpen = !isFormOpen"
        >
          {{ isFormOpen ? 'Cancel' : 'Add channel' }}
        </Button>
      </div>

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

    <!-- Same transition classes as ChannelView's edit form, so the two screens feel identical.
         The component has a single root element, which is what Transition needs. -->
    <Transition
      enter-active-class="animate-in fade-in-0 zoom-in-95 duration-200"
      leave-active-class="animate-out fade-out-0 zoom-out-95 duration-200"
    >
      <div
        v-if="isFormOpen"
        id="channel-create-form"
      >
        <ChannelCreateForm :on-created="handleCreated" />
      </div>
    </Transition>
  </div>
</template>
