---
name: vue
description: Vue 3.5 SFC and composable conventions for the overlay app, plus the formatting and lint order a change has to satisfy.
paths:
  - "apps/frontend/src/**"
  - "apps/frontend/*.config.ts"
  - "apps/frontend/.prettierrc.json"
---

# Vue 3.5

## SFC shape

`<script setup lang="ts">` first, `<template>` second, `<style>` last if present. No
Options API, no `defineComponent`.

Props are type-declared, never runtime-declared:

```vue
<script setup lang="ts">
interface Props {
  level: number;
  label?: string;
}

const { level, label = 'XP' } = defineProps<Props>();
</script>
```

Destructuring `defineProps` keeps reactivity in Vue 3.5+ - the compiler rewrites the
bindings back to `props.x` - and native default syntax replaces `withDefaults`. Never
`defineProps(['level'])`.

Two-way binding is `defineModel<T>()`:

```ts
const value = defineModel<number>({ required: true });
```

Emits are typed too: `const emit = defineEmits<{ close: []; select: [id: number] }>()`.

## Composables

Anything stateful or reused goes in `src/composables/`, named `useX`, returning refs:

```ts
export const useThing = (source: MaybeRefOrGetter<string>) => {
  const data = ref<Thing | null>(null);
  watchEffect(() => {
    void toValue(source);
    // ...
  });
  return { data };
};
```

Accept `MaybeRefOrGetter` and read through `toValue()`, so a caller can pass a ref, a
getter or a plain value. Export through the folder barrel.

Socket subscriptions specifically belong in `src/composables/sockets/` - see the realtime
rule.

## Imports and structure

- Always the `@/` alias: `import { socket } from '@/services';`
- Components group by feature (`components/lottery/`, `components/pokemon/`, `components/twitch/`), with shared primitives in `components/ui/`. Every folder has a barrel `index.ts`.
- Icons are SFCs in `src/assets/icons/`, exported from that barrel.

## Formatting and lint

`apps/frontend/.prettierrc.json`: single quotes, semicolons, two spaces, `printWidth` 100,
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

Type-check with `vue-tsc --build` (`pnpm --filter frontend type-check`), not `tsc`; it
uses the project references in `apps/frontend/tsconfig.json`.

## noUncheckedIndexedAccess

`apps/frontend/tsconfig.app.json` enables it, so indexed reads are `T | undefined` in this
app. Narrow them rather than asserting - see the typescript rule.
