<script setup lang="ts">
import { ref } from 'vue';

interface User {
  twitchId: string;
  username: string;
}

interface BackendValidationError {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
}

type FormErrors = Partial<Record<keyof User | 'global', string>>;

const user = ref<User>({ twitchId: '', username: '' });
const errors = ref<FormErrors>({});

const createUserRequest = async (userData: User) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const responseData = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    throw { status: response.status, data: responseData };
  }
  return responseData;
};

const onSubmit = async () => {
  errors.value = {};

  const newUser: User = {
    twitchId: user.value.twitchId,
    username: user.value.username,
  };

  try {
    await createUserRequest(newUser);

    user.value = { twitchId: '', username: '' };
    console.log('User created successfully!');
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const errorData = err.data as BackendValidationError;

      if (errorData.errors) {
        Object.entries(errorData.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            errors.value[field as keyof FormErrors] = messages[0];
          }
        });
      } else {
        errors.value.global = errorData.message || 'Server error';
      }
    } else {
      errors.value.global = err instanceof Error ? err.message : 'Network error';
    }
  }

  console.log(newUser);
};
</script>

<template>
  <div>
    <form
      class="mx-auto flex w-175 flex-col rounded-lg border-2 border-slate-700 bg-slate-800"
      @submit.prevent="onSubmit"
    >
      <h1>User form</h1>
      <input
        v-model="user.twitchId"
        type="text"
        placeholder="twitchId"
      />
      <input
        v-model="user.username"
        type="text"
        placeholder="username"
      />
      <button type="submit">Create user</button>
    </form>
    <span>{{ errors }}</span>
  </div>
</template>
