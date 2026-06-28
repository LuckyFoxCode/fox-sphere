<script setup lang="ts">
interface Winner {
  place: number;
  username: string;
  twitchId: string;
}

defineProps<{
  winners: Winner[];
}>();
</script>

<template>
  <div class="border-line bg-bg flex flex-col gap-y-2 rounded-lg border-5 p-2">
    <p class="text-center text-xl uppercase">weekly lottery: final winners</p>
    <ul class="grid grid-cols-2 gap-2">
      <li
        v-for="winner in winners"
        :key="winner.twitchId"
        class="border-line bg-card/70 relative flex flex-col items-center gap-y-2 rounded-lg border-3 p-2"
      >
        <span class="text-lime absolute top-0.5 right-1 text-xl">#{{ winner.place }}</span>
        <div class="border-line flex size-10 items-center justify-center rounded-full border-2">
          🎰
        </div>
        <span class="text-lg capitalize">{{ winner.username }}</span>
      </li>
    </ul>
    <p class="text-text-second text-lg">
      ✨ All VIP statuses successfully distributed! See you next week! ✨
    </p>
  </div>
</template>
