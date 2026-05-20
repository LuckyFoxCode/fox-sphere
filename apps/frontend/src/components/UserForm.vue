<script setup lang="ts">
import { ref } from 'vue';

interface User {
  twitchId: string;
  username: string;
}

const user = ref<User>({ twitchId: '', username: '' });

const createUser = async (userData: User) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  return response;
};

const onSubmit = () => {
  const newUser: User = {
    twitchId: user.value.twitchId,
    username: user.value.username,
  };

  console.log(newUser);
  createUser(newUser);

  user.value.twitchId = '';
  user.value.username = '';
};
</script>

<template>
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
</template>
