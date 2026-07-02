<script setup lang="ts">
interface Props {
  size?: string;
  direction?: 'horizontal' | 'vertical';
}

withDefaults(defineProps<Props>(), {
  size: '140px',
  direction: 'horizontal',
});
</script>

<template>
  <div
    class="flex items-stretch bg-transparent select-none"
    :class="[direction === 'horizontal' ? 'h-3.5 flex-row' : 'w-3.5 flex-col']"
    :style="direction === 'horizontal' ? { width: size } : { height: size }"
  >
    <div
      class="bg-bg/90"
      :class="[
        direction === 'horizontal' ? 'w-3 border-t-2 border-l-2' : 'h-3 border-t-2 border-l-2',
      ]"
      :style="{
        borderColor: 'var(--widget-color)',
        clipPath:
          direction === 'horizontal'
            ? 'polygon(100% 100%, 0 0, 100% 0)'
            : 'polygon(0 100%, 100% 100%, 0% 0)',
      }"
    />

    <div
      class="bg-bg/90 flex grow items-center justify-center"
      :class="[direction === 'horizontal' ? 'border-t-2 px-2' : 'border-l-2 py-2']"
      :style="{ borderColor: 'var(--widget-color)' }"
    >
      <div
        class="rounded-full opacity-90"
        :class="[direction === 'horizontal' ? 'h-0.5 w-full' : 'h-full w-0.5']"
        :style="{
          backgroundColor: 'var(--widget-color)',
          boxShadow: '0 0 8px var(--widget-color)',
        }"
      />
    </div>

    <div
      class="bg-bg/90"
      :class="[
        direction === 'horizontal' ? 'w-3 border-t-2 border-r-2' : 'h-3 border-b-2 border-l-2',
      ]"
      :style="{
        borderColor: 'var(--widget-color)',
        clipPath:
          direction === 'horizontal'
            ? 'polygon(0 0, 100% 0, 0 100%)'
            : 'polygon(0 0, 100% 0, 0 100%)',
      }"
    />
  </div>
</template>
