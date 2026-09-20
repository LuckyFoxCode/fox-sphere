<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { useTheme } from '@/composables/useTheme';
import { Button } from '@/components/ui/button';

const { isDark, toggle } = useTheme();
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    aria-label="Toggle dark mode"
    @click="toggle"
  >
    <Sun
      v-if="isDark"
      class="size-5"
    />
    <Moon
      v-else
      class="size-5"
    />
  </Button>
</template>
