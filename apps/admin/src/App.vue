<script setup lang="ts">
import createClient from 'openapi-fetch';
import { onMounted, ref } from 'vue';
import type { paths } from './lib/api/openapi.d.ts';

const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

const channel = ref<{
  login: string;
  displayName: string;
  status: string;
} | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
  const { data, error: apiError } = await api.GET('/api/channels/{id}', {
    params: { path: { id: 'clx1abc123def' } },
  });
  if (apiError) error.value = JSON.stringify(apiError);
  else if (data) channel.value = data;
  loading.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 p-8 text-white">
    <h1 class="mb-4 text-2xl font-bold">Fox Sphere Admin</h1>
    <div v-if="loading">Loading...</div>
    <div
      v-else-if="error"
      class="text-red-400"
    >
      {{ error }}
    </div>
    <div v-else>
      <p>Login: {{ channel?.login }}</p>
      <p>Display: {{ channel?.displayName }}</p>
      <p>Status: {{ channel?.status }}</p>
    </div>
  </div>
</template>
