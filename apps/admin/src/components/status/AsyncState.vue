<script setup lang="ts">
defineProps<{
  isPending: boolean;
  isError: boolean;
  failure: string | null;
  notFound?: string;
}>();
</script>

<template>
  <p
    v-if="isPending"
    role="status"
  >
    Loading...
  </p>
  <p
    v-else-if="isError"
    class="text-destructive text-sm"
    role="alert"
  >
    Could not reach the api - is it running on :3001?
  </p>
  <p
    v-else-if="failure"
    class="text-destructive text-sm"
    role="alert"
  >
    {{ failure }}
  </p>
  <p
    v-else-if="notFound"
    class="text-muted-foreground text-sm"
    role="status"
  >
    {{ notFound }}
  </p>
</template>
