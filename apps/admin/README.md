# admin

Admin-panel frontend (Vue 3.5 + Vite + Tailwind 4). **Local-only** - not built by CI, not
deployed. Dev server on `:5174`, proxying `/api` and `/socket.io` to the admin backend
`apps/api` on `:3001`.

```bash
pnpm dev:a          # from the repo root (runs gen:api, then vite)
pnpm dev:api        # in another terminal - the backend the proxy points at
```

## The API client is generated

Nothing in `src/api/generated/` is written by hand. The chain is:

```
apps/api route (createModule + route())
  -> pnpm --filter api openapi:dump   -> apps/api/openapi.json   (committed)
  -> pnpm gen:api  (orval)            -> src/api/generated/      (committed)
  -> useGetChannelById() in a component
```

`orval.config.ts` reads the **committed spec file**, not a live server, so `pnpm gen:api`,
`pnpm build` and CI all work with nothing running.

### Regenerate

```bash
pnpm --filter api openapi:dump      # only if the api routes changed
pnpm gen:api                        # from apps/admin (alias: orval)
```

`pnpm dev` and `pnpm build` run `gen:api` first, so a stale client is normally impossible -
as long as `openapi.json` itself is current. Adding a route means running **both** commands
in the same commit.

### Layout

`mode: 'tags-split'` - one folder per OpenAPI tag, one module per schema:

```
src/api/generated/
  channels/channels.ts    # useGetChannelById, getChannelById, query keys
  schemas/                # Channel, ChannelStatus, index.ts
```

The tag comes from `createModule("Channels")` in `apps/api`; the hook name comes from that
route's `operationId`.

## Using a hook

`main.ts` installs `VueQueryPlugin` once. In a component:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGetChannelById } from '@/api/generated/channels/channels';

// A path param takes a ref, a getter or a plain value; the ref is part of the
// query key, so editing it refetches.
const channelId = ref('clx1abc123def');
const { data, isPending, isError } = useGetChannelById(channelId);

// Every documented status is its own member of the response union - narrow on it.
const channel = computed(() => (data.value?.status === 200 ? data.value.data : null));
</script>

<template>
  <p v-if="isPending">Loading...</p>
  <p v-else-if="isError">Request failed</p>
  <p v-else-if="channel">{{ channel.login }}</p>
  <p v-else>Channel not found</p>
</template>
```

The fetch client returns `{ data, status, headers }`, so the payload is `data.value.data` -
the outer `data` is the vue-query ref. A documented 4xx is **not** a thrown error here: it
comes back as another member of the union (`status: 404`), so check `status` rather than
relying on `isError`, which only fires on a transport failure.

## Inspecting the query cache

`<VueQueryDevtools />` is mounted in `App.vue` - the floating TanStack logo, bottom of the
page. It lists every query by key, its state (fresh / stale / fetching / inactive), the last
response, and buttons to refetch, invalidate or reset one. Vue DevTools shows the component
refs; this shows the cache behind them. It compiles to a no-op in a production build.

Mutations (`POST`/`PATCH`/`DELETE`) come out as `useCreateUser()`-style hooks returning
`{ mutate, mutateAsync, isPending }` - same import path, same naming rule.

Requests go to relative `/api/*`, which Vite proxies to `:3001` in dev. There is no
Authorization handling yet; when it is needed, add an orval `override.mutator` pointing at
a custom fetch wrapper rather than editing generated files.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | `gen:api`, then Vite on `:5174` |
| `pnpm gen:api` | orval - regenerate the client from `../api/openapi.json` |
| `pnpm build` | `gen:api`, then type-check + Vite build |
| `pnpm type-check` | `vue-tsc --build` |
| `pnpm lint` | oxlint then eslint, both with `--fix` |
| `pnpm format` | Prettier over `src/` |
| `pnpm test:unit` | Vitest |
