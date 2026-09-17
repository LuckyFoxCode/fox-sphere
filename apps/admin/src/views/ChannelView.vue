<script setup lang="ts">
import {
  useDeleteChannel,
  useGetChannelById,
  usePatchChannel,
  type patchChannelResponse,
} from '@/api/generated/channels/channels';
import { ChannelStatus } from '@/api/generated/schemas';
import { statusVariant } from '@/components/channels';
import { AsyncState } from '@/components/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computed, ref, watchEffect } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const channelId = computed(() => String(route.params.id));

const { data, isPending, isError, refetch } = useGetChannelById(channelId);

const isEditing = ref(false);
const channel = computed(() => (data.value?.status === 200 ? data.value.data : null));
const failure = computed(() => {
  const response = data.value;

  if (!response || response.status === 200 || response.status === 404) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
});

const statuses = Object.values(ChannelStatus);

const editStatus = ref<ChannelStatus>(ChannelStatus.ACTIVE);
const editBotIsMod = ref(false);

watchEffect(() => {
  if (channel.value) {
    editStatus.value = channel.value.status;
    editBotIsMod.value = channel.value.botIsMod;
  }
});

const { mutate: patchMutate, isPending: patchPending } = usePatchChannel();
const { mutate: deleteMutate, isPending: deletePending } = useDeleteChannel();

const serverError = ref<string | null>(null);

const extractMessage = (response: patchChannelResponse): string => {
  if (response.status >= 400 && 'message' in response.data) {
    return (response.data as { message: string }).message;
  }
  return `Request failed (HTTP ${response.status})`;
};

const handleSave = () => {
  patchMutate(
    { id: channelId.value, data: { status: editStatus.value, botIsMod: editBotIsMod.value } },
    {
      onSuccess: (response) => {
        if (response.status === 200) {
          serverError.value = null;
          refetch();
          isEditing.value = false;
        } else {
          serverError.value = extractMessage(response);
        }
      },
    },
  );
};

const handleDelete = () => {
  if (!confirm('Delete this channel?')) return;

  deleteMutate(
    { id: channelId.value },
    {
      onSuccess: (response) => {
        if (response.status === 204) {
          router.push('/channels');
        } else {
          serverError.value =
            'message' in response.data
              ? (response.data as { message: string }).message
              : `Request failed (HTTP ${response.status})`;
        }
      },
    },
  );
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
      not-found="Channel not found"
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

        <div
          v-if="isEditing"
          class="bg-card w-full max-w-3xs rounded-xl border px-3 py-3"
        >
          <h2 class="mb-4">Edit channel</h2>
          <form
            class="flex flex-col gap-y-5"
            @submit.prevent="handleSave"
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  v-model="editStatus"
                  class="w-40"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="s in statuses"
                      :key="s"
                      :value="s"
                    >
                      {{ s }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel>
                  <Checkbox v-model:checked="editBotIsMod" />
                  Bot is moderator
                </FieldLabel>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              :disabled="patchPending"
              class="cursor-pointer"
            >
              {{ patchPending ? 'Saving...' : 'Save' }}
            </Button>

            <p
              v-if="serverError"
              class="text-destructive text-sm"
            >
              {{ serverError }}
            </p>
          </form>
        </div>
      </div>

      <div class="flex gap-x-2">
        <Button
          variant="outline"
          :disabled="deletePending"
          class="cursor-pointer"
          @click="() => (isEditing = !isEditing)"
        >
          {{ isEditing ? 'Cancel' : 'Edit channel' }}
        </Button>
        <Button
          variant="destructive"
          :disabled="deletePending"
          class="cursor-pointer"
          @click="handleDelete"
        >
          {{ deletePending ? 'Deleting...' : 'Delete channel' }}
        </Button>
      </div>
    </template>
  </div>
</template>
