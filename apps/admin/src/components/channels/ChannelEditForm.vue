<script setup lang="ts">
import { usePatchChannel, type patchChannelResponse } from '@/api/generated/channels/channels';
import { ChannelStatus, type Channel } from '@/api/generated/schemas';
import { ref, watchEffect } from 'vue';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '../ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const props = defineProps<{
  channel: Channel;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const statuses = Object.values(ChannelStatus);

const editStatus = ref<ChannelStatus>(ChannelStatus.ACTIVE);
const editBotIsMod = ref(false);

watchEffect(() => {
  editStatus.value = props.channel.status;
  editBotIsMod.value = props.channel.botIsMod;
});

const { mutate: patchMutate, isPending: patchPending } = usePatchChannel();

const serverError = ref<string | null>(null);

const extractMessage = (response: patchChannelResponse): string => {
  if (response.status >= 400 && 'message' in response.data) {
    return (response.data as { message: string }).message;
  }
  return `Request failed (HTTP ${response.status})`;
};

const handleSave = () => {
  patchMutate(
    { login: props.channel.login, data: { status: editStatus.value, botIsMod: editBotIsMod.value } },
    {
      onSuccess: (response) => {
        if (response.status === 200) {
          serverError.value = null;
          emit('saved');
        } else {
          serverError.value = extractMessage(response);
        }
      },
    },
  );
};
</script>

<template>
  <div class="bg-card w-full max-w-3xs rounded-xl border px-3 py-3">
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
            <Checkbox v-model="editBotIsMod" />
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
</template>