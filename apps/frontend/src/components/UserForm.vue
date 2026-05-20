<script setup lang="ts">
import { ref } from 'vue';

interface User {
  twitchId: string;
  username: string;
}

const user = ref<User>({ twitchId: '', username: '' });
const errorMess = ref('');

const createUser = async (userData: User) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    const errorMessage = errorData.message || `Ошибка сервера: ${response.status}`;
    throw new Error(errorMessage);
  }

  return await response.json();
};

const onSubmit = async () => {
  const newUser: User = {
    twitchId: user.value.twitchId,
    username: user.value.username,
  };

  try {
    errorMess.value = '';
    await createUser(newUser);

    user.value.twitchId = '';
    user.value.username = '';
  } catch (error) {
    if (error instanceof Error) {
      errorMess.value = error.message || 'Что-то пошло не так';
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
    <span>{{ errorMess }}</span>
  </div>
</template>
