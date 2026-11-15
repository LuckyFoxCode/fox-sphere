<template>
  <div
    class="border-sticker-edge bg-sticker-body font-quicksand relative flex items-center rounded-2xl border-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
  >
    <span
      aria-hidden="true"
      class="sticker-grain pointer-events-none absolute inset-0 rounded-[14px]"
    />
    <slot />
  </div>
</template>

<style scoped>
/* Бумажное зерно: та же крупа, что в чат-карточке, но выведенная из цвета
   контура - наклейка и её обрезка сделаны из одной бумаги. Радиус 14 = 16
   (rounded-2xl) минус 2 (border-2), иначе крупа вылезает в скруглении. */
.sticker-grain {
  background-image: radial-gradient(rgba(220, 203, 178, 0.16) 0.6px, transparent 0.6px);
  background-size: 3px 3px;
  opacity: 0.45;
}
</style>
