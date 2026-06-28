<script setup lang="ts">
interface LotteryWinnerRevealProps {
  place: number;
  username: string;
  lostPlace?: number;
}

defineProps<{ place: number; username: string; lostPlace?: number }>();
</script>

<template>
  <div class="border-line bg-card flex flex-col border-13">
    <span class="text-xl uppercase">🔥place: #{{ place }}</span>
    <div class="flex flex-col gap-y-2">
      <div class="border-line flex size-10 items-center justify-center rounded-full border-5">
        <!-- icon avatar -->
      </div>
      <span class="text-lg">{{ username }}</span>
      <p class="text-text-second">🎉 Gets weekly VIP!🎫</p>
    </div>
  </div>
</template>
