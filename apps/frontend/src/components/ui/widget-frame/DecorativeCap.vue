<script setup lang="ts">
interface Props {
  size?: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

withDefaults(defineProps<Props>(), {
  size: '140px',
  direction: 'top',
});
</script>

<template>
  <div
    class="flex items-stretch bg-transparent select-none"
    :class="[direction === 'top' || direction === 'bottom' ? 'h-3.5 flex-row' : 'w-3.5 flex-col']"
    :style="direction === 'top' || direction === 'bottom' ? { width: size } : { height: size }"
  >
    <div
      class="bg-bg/95"
      :class="[
        direction === 'top' || direction === 'bottom' ? 'w-3' : 'h-3',
        direction === 'top' ? 'border-t-2 border-l-2' : '',
        direction === 'bottom' ? 'border-b-2 border-l-2' : '',
        direction === 'left' ? 'border-t-2 border-l-2' : '',
        direction === 'right' ? 'border-t-2 border-r-2' : '',
      ]"
      :style="{
        borderColor: 'var(--widget-color)',
        clipPath:
          direction === 'top'
            ? 'polygon(0 0, 100% 0, 100% 100%)'
            : direction === 'bottom'
              ? 'polygon(100% 0, 0 100%, 100% 100%)'
              : direction === 'left'
                ? 'polygon(0% 100%, 100% 100%, 0% 0)'
                : 'polygon(100% 100%, 0 100%, 100% 0)',
      }"
    />

    <div
      class="bg-bg/95 flex grow items-center justify-center"
      :class="[
        direction === 'top' ? 'border-t-2 px-2' : '',
        direction === 'bottom' ? 'border-b-2 px-2' : '',
        direction === 'left' ? 'border-l-2 py-2' : '',
        direction === 'right' ? 'border-r-2 py-2' : '',
      ]"
      :style="{ borderColor: 'var(--widget-color)' }"
    >
      <div
        class="rounded-full opacity-90"
        :class="[direction === 'top' || direction === 'bottom' ? 'h-0.5 w-full' : 'h-full w-0.5']"
        :style="{
          backgroundColor: 'var(--widget-color)',
          boxShadow: '0 0 6px var(--widget-color)',
        }"
      />
    </div>

    <div
      class="bg-bg/95"
      :class="[
        direction === 'top' || direction === 'bottom' ? 'w-3' : 'h-3',
        direction === 'top' ? 'border-t-2 border-r-2' : '',
        direction === 'bottom' ? 'border-r-2 border-b-2' : '',
        direction === 'left' ? 'border-b-2 border-l-2' : '',
        direction === 'right' ? 'border-r-2 border-b-2' : '',
      ]"
      :style="{
        borderColor: 'var(--widget-color)',
        clipPath:
          direction === 'top'
            ? 'polygon(0 0, 100% 0, 0 100%)'
            : direction === 'bottom'
              ? 'polygon(0 0, 100% 100%, 0 100%)'
              : direction === 'left'
                ? 'polygon(0 0, 100% 0, 0 100%)'
                : 'polygon(100% 0, 0 0, 100% 100%)',
      }"
    />
  </div>
</template>
