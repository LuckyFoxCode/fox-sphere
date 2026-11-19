<template>
  <div
    class="border-sticker-edge font-quicksand relative overflow-hidden rounded-2xl border-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
  >
    <span
      aria-hidden="true"
      class="paper-grain pointer-events-none absolute inset-0 rounded-[14px]"
    />
    <slot />
  </div>
</template>

<style scoped>
/* Бумажное зерно второго материала: та же крупа, что у графтовой наклейки
   (`StickerFrame`), но выведенная из чернил, а не из овсяного контура - на
   светлой бумаге овсяные точки не видны вовсе. Радиус 14 = 16 (rounded-2xl)
   минус 2 (border-2), иначе крупа вылезает в скруглении. */
.paper-grain {
  background-image: radial-gradient(rgba(43, 38, 48, 0.14) 0.6px, transparent 0.6px);
  background-size: 3px 3px;
  opacity: 0.5;
}
</style>
