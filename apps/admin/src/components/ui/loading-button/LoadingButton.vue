<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { Loader2 } from '@lucide/vue';
import type { ButtonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';

defineOptions({
  inheritAttrs: false,
});

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  loading?: boolean;
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  loading: false,
});
</script>

<template>
  <Button
    v-bind="$attrs"
    :as="as"
    :as-child="asChild"
    :variant="variant"
    :size="size"
    :disabled="loading || ($attrs.disabled !== undefined && $attrs.disabled !== false)"
    :class="props.class"
  >
    <Loader2 v-if="loading" class="animate-spin" />
    <slot />
  </Button>
</template>