<script setup lang="ts">
import { useDeleteChannel, useGetChannelById } from '@/api/generated/channels/channels';
import { ChannelEditForm, statusVariant } from '@/components/channels';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { AsyncState } from '@/components/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const channelLogin = computed(() => String(route.params.login));

const { data, isPending, isError, refetch } = useGetChannelById(channelLogin);

const isEditing = ref(false);
const channel = computed(() => (data.value?.status === 200 ? data.value.data : null));
const failure = computed(() => {
  const response = data.value;

  if (!response || response.status === 200 || response.status === 404) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
});

const { mutateAsync: deleteChannelAsync } = useDeleteChannel();

const { toastSuccess } = useToast();

const handleSaved = () => {
  toastSuccess('Channel updated');
  refetch();
  isEditing.value = false;
};

const handleDelete = async () => {
  const response = await deleteChannelAsync({ login: channelLogin.value });

  if (response.status !== 204) {
    const message =
      'message' in response.data && typeof response.data.message === 'string'
        ? response.data.message
        : `Request failed (HTTP ${response.status})`;

    throw new Error(message);
  }

  toastSuccess('Channel deleted');
  router.push('/channels');
};
</script>

<template>
  <div class="flex flex-col gap-y-6">
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
      :not-found="data?.status === 404 ? 'Channel not found' : undefined"
    />

    <template v-if="channel">
      <div class="flex gap-x-6">
        <dl class="bg-card divide-border w-full max-w-md divide-y rounded-xl border">
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

        <Transition
          enter-active-class="animate-in fade-in-0 zoom-in-95 duration-200"
          leave-active-class="animate-out fade-out-0 zoom-out-95 duration-200"
        >
          <ChannelEditForm
            v-if="isEditing"
            :channel="channel"
            @saved="handleSaved"
          />
        </Transition>
      </div>

      <div class="flex gap-x-2">
        <Button
          as-child
          variant="outline"
          class="cursor-pointer"
        >
          <RouterLink :to="`/channels/${channel.login}/viewers`">Viewers</RouterLink>
        </Button>
        <ConfirmDialog
          :on-confirm="handleDelete"
          confirm-text="Delete"
          description="This will remove the channel. This action cannot be undone."
          title="Delete channel?"
        >
          <Button
            variant="destructive"
            class="cursor-pointer"
          >
            Delete channel
          </Button>
        </ConfirmDialog>
        <Button
          variant="outline"
          class="cursor-pointer"
          @click="() => (isEditing = !isEditing)"
        >
          {{ isEditing ? 'Cancel' : 'Edit channel' }}
        </Button>
      </div>
    </template>
  </div>
</template>
