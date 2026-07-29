<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  url: string;
  name: string;
}>();

const isFailed = ref(false);
</script>

<template>
  <span v-if="isFailed">{{ name }}</span>
  <img
    v-else
    :src="url"
    :alt="name"
    :title="name"
    class="mx-0.5 inline-block h-6 max-h-6 object-contain align-middle"
    @error="isFailed = true"
  />
</template>
