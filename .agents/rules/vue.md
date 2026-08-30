---
name: vue
description: Vue 3.5 SFC and composable conventions for the overlay app, plus the formatting and lint order a change has to satisfy.
paths:
  - "apps/overlay/src/**"
  - "apps/overlay/*.config.ts"
  - "apps/overlay/.prettierrc.json"
---

# Vue 3.5

General Vue 3 patterns - Composition API, `defineProps`/`defineModel`/`defineEmits`,
composables, reactivity - live in the `vue-best-practices` skill. This rule covers only
what is specific to fox-sphere.

## SFC shape

`<script setup lang="ts">` first, `<template>` second, `<style>` last if present. No
Options API, no `defineComponent`.

Props are type-declared, never runtime-declared. That is the target, not a description of
what is there now: no component uses the Vue 3.5 destructure-with-defaults form yet; 23
`defineProps` calls take props without defaults, and three components still use
`withDefaults` - `components/ui/widget-frame/WidgetFrame.vue`,
`components/ui/widget-frame/DecorativeCap.vue`, `components/ui/TwitchEmote.vue`. Those work
and are not bugs. Convert one when you are already editing it; do not sweep them.

## Composables

Anything stateful or reused goes in `src/composables/`, named `useX`. Export through the
folder barrel.

Socket subscriptions specifically belong in `src/composables/sockets/` - see the realtime
rule.

## Imports and structure

- Always the `@/` alias: `import { socket } from '@/services';`
- Components group by feature (`components/lottery/`, `components/pokemon/`, `components/twitch/`), with shared primitives in `components/ui/`. Every folder has a barrel `index.ts`.
- Icons are SFCs in `src/assets/icons/`, exported from that barrel.

## Formatting and lint

`apps/overlay/.prettierrc.json`: single quotes, semicolons, two spaces, `printWidth` 100,
`trailingComma: "all"`, `arrowParens: "always"`, and **`singleAttributePerLine: true`** -
so a multi-prop tag breaks one attribute per line. `prettier-plugin-tailwindcss` orders
class lists; never hand-sort them.

Props are camelCase in script and kebab-case as template attributes:

```vue
<XpProgressBar
  :max-xp="maxXp"
  :new-xp="newXp"
/>
```

`pnpm lint:f` is `run-s lint:*`, so **oxlint runs first, then eslint**, both with `--fix`.
oxlint has `correctness` at error with the `vue`, `typescript`, `unicorn` and `oxc`
plugins enabled. Both must be clean - a green eslint over a failing oxlint is a red gate.

Type-check with `vue-tsc --build` (`pnpm --filter overlay type-check`), not `tsc`; it
uses the project references in `apps/overlay/tsconfig.json`.

## noUncheckedIndexedAccess

`apps/overlay/tsconfig.app.json` enables it, so indexed reads are `T | undefined` in this
app. Narrow them rather than asserting - see the typescript rule.
