<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    url: string;
    name: string;
    size?: number;
  }>(),
  { size: 24 },
);

const isFailed = ref(false);
</script>

<template>
  <span v-if="isFailed">{{ name }}</span>
  <img
    v-else
    :src="url"
    :alt="name"
    :title="name"
    class="mx-0.5 inline-block object-contain align-middle"
    :style="{ height: `${size}px` }"
    @error="isFailed = true"
  />
</template>
