<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { TwitchAddVipPaylod } from '@fox-sphere/types';

defineProps<{ addVip: TwitchAddVipPaylod }>();
</script>

<template>
  <WidgetFrame variant="rose">
    <p class="flex items-center gap-x-1">
      👑
      <span class="text-text-main/70 text-xl">
        <span class="font-medium text-amber-600">Level Up: </span>
        <span class="text-event-rose text-[27px] font-bold">{{ addVip.username }}!</span>
        is now officially a
        <span class="text-event-rose text-[27px] font-extrabold">VIP!</span>
        Elite presence activated.
      </span>
      💎
    </p>
  </WidgetFrame>
</template>
