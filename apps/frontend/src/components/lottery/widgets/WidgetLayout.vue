<script setup lang="ts">
defineProps<{
  cardClass?: string;
}>();
</script>

<template>
  <div
    class="border-line/40 from-card/95 to-bg/80 animate-fade-in relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-radial-[at_50%_0%] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(163,230,53,0.05)] backdrop-blur-xl select-none"
    :class="cardClass"
  >
    <div
      class="via-lime/60 absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent to-transparent shadow-[0_1px_10px_rgba(163,230,53,0.4)]"
    />

    <slot />
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
