<script setup lang="ts">
import { useCreateChannel, type createChannelResponse } from '@/api/generated/channels/channels';
import { CreateChannelStatus, type CreateChannel } from '@/api/generated/schemas';
import { useForm } from '@tanstack/vue-form';
import { ref } from 'vue';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const props = defineProps<{
  onCreated?: () => void;
}>();

const { mutate, isPending } = useCreateChannel();

const statuses = Object.values(CreateChannelStatus);

const defaultValues: CreateChannel = {
  twitchId: '',
  login: '',
  displayName: '',
  status: CreateChannelStatus.ACTIVE,
  botIsMod: false,
};

const form = useForm({
  defaultValues,
  onSubmit: async ({ value }) => {
    mutate(
      { data: value },
      {
        onSuccess: (response) => {
          if (response.status === 201) {
            form.reset();
            props.onCreated?.();
          } else {
            serverError.value = extractMessage(response);
          }
        },
      },
    );
  },
});

const serverError = ref<string | null>(null);

const extractMessage = (response: createChannelResponse): string => {
  if (response.status >= 400 && 'message' in response.data) {
    return (response.data as { message: string }).message;
  }
  return `Request failed (HTTP ${response.status})`;
};
</script>

<template>
  <div class="rounded-xl border-2 px-3 py-5">
    <h2 class="mb-4">Create new channel:</h2>
    <form
      class="flex flex-col gap-y-5"
      @submit.prevent="form.handleSubmit()"
    >
      <FieldGroup>
        <form.Field name="twitchId">
          <template #default="{ field }">
            <Field>
              <FieldLabel :for="field.name"> Twitch ID </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
              <FieldError :errors="field.state.meta.errors" />
            </Field>
          </template>
        </form.Field>
      </FieldGroup>
      <FieldGroup>
        <form.Field name="login">
          <template #default="{ field }">
            <Field>
              <FieldLabel :for="field.name"> Login </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
              <FieldError :errors="field.state.meta.errors" />
            </Field>
          </template>
        </form.Field>
      </FieldGroup>
      <FieldGroup>
        <form.Field name="displayName">
          <template #default="{ field }">
            <Field>
              <FieldLabel :for="field.name"> Display Name </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
              <FieldError :errors="field.state.meta.errors" />
            </Field>
          </template>
        </form.Field>
      </FieldGroup>
      <FieldGroup>
        <form.Field name="status">
          <template #default="{ field }">
            <Field>
              <FieldLabel :for="field.name">Status</FieldLabel>
              <Select
                :model-value="field.state.value"
                @update:model-value="(v) => field.handleChange(v as CreateChannelStatus)"
              >
                <SelectTrigger
                  :id="field.name"
                  class="w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="s in statuses"
                    :key="s"
                    :value="s"
                    >{{ s }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </template>
        </form.Field>
      </FieldGroup>
      <FieldGroup>
        <form.Field name="botIsMod">
          <template #default="{ field }">
            <Field orientation="horizontal">
              <FieldLabel>
                <Checkbox
                  :model-value="field.state.value === true"
                  @update:model-value="(v) => field.handleChange(v === true)"
                />
                Bot is moderator
              </FieldLabel>
            </Field>
          </template>
        </form.Field>
      </FieldGroup>

      <Button
        type="submit"
        :disabled="isPending"
        >{{ isPending ? 'Adding...' : 'Add channel' }}</Button
      >

      <p
        v-if="serverError"
        class="text-destructive text-sm"
      >
        {{ serverError }}
      </p>
    </form>
  </div>
</template>
