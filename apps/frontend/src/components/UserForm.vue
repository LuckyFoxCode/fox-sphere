<script setup lang="ts">
import { ref } from 'vue';

interface BackendErrorResponse {
  message: string;
  error?: string;
  details?: {
    name: string;
    message: string;
  };
}

interface CustomFetchError {
  status: number;
  data: BackendErrorResponse;
}

interface User {
  twitchId: string;
  username: string;
}

interface FormErrors {
  twitchId?: string;
  username?: string;
  global?: string;
}

function isCustomFetchError(error: unknown): error is CustomFetchError {
  return error !== null && typeof error === 'object' && 'status' in error && 'data' in error;
}

const user = ref<User>({ twitchId: '', username: '' });
const errors = ref<FormErrors>({});

const createUser = async (userData: User) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      status: response.status,
      data: responseData,
    };
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
    await createUser(newUser);

    user.value.twitchId = '';
    user.value.username = '';
  } catch (error: unknown) {
    if (isCustomFetchError(error)) {
      const errorData = error.data;

      if (errorData.details && typeof errorData.details.message === 'string') {
        try {
          const zodIssue = JSON.parse(errorData.details.message);

          if (Array.isArray(zodIssue)) {
            zodIssue.forEach((issue) => {
              const fieldName = issue.path?.[0] as keyof FormErrors;
              if (fieldName) {
                errors.value[fieldName] = issue.message;
              }
            });
          }
        } catch {
          errors.value.global = errorData.message;
        }
      } else if (errorData.message) {
        errors.value.global = errorData.message;
      }
    } else if (error instanceof Error) {
      errors.value.global = error.message;
    } else {
      errors.value.global = 'Something went wrong...';
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
