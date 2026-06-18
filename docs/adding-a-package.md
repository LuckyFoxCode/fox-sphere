# Adding a new workspace package

Shared code lives in `packages/*` as `@fox-sphere/<name>` packages, built with
[**tsdown**](https://tsdown.dev) (Rolldown-powered) and consumed by the apps via
`workspace:*`. This is how `@fox-sphere/shared-schemas` is set up — follow the
same shape for anything new (DTOs, utils, shared types, clients).

## TL;DR

```bash
pnpm new:pkg <name>          # scaffold packages/<name> (kebab-case)
pnpm install                 # link it into the workspace
# ...write code under packages/<name>/src, re-export from src/index.ts...
pnpm build                   # build all packages + frontend
```

## What the scaffolder creates

`pnpm new:pkg <name>` (→ `scripts/create-package.mjs`) writes a ready-to-build
package:

```
packages/<name>/
├── package.json        # @fox-sphere/<name>, ESM, exports map, build/dev/type:check
├── tsdown.config.ts    # single ESM entry, dts + sourcemap
├── tsconfig.json       # for type-check / editor (NOT used to build)
├── index.ts            # entry — re-exports ./src/index.js
└── src/
    └── index.ts        # your public API
```

It refuses to overwrite an existing package and validates the name is
kebab-case. The package is `private: true` (workspace-only, not published).

## Anatomy

**`package.json`** — ESM, with both legacy (`main`/`types`) and modern
(`exports`) resolution pointing at the single bundled output:

```jsonc
{
  "name": "@fox-sphere/<name>",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "type:check": "tsc --noEmit"
  }
}
```

**`tsdown.config.ts`** — one entry, bundled to `dist/index.{js,d.ts}`:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm'],        // ESM-only — apps and Node 24 are ESM
  dts: true,              // emit .d.ts alongside
  sourcemap: true,
  clean: true,            // wipe dist before each build
  treeshake: true,
  target: 'esnext',
  outExtensions: () => ({ js: '.js' })  // .js, not .mjs
})
```

Notes:
- **Runtime `dependencies` stay external.** tsdown does not bundle declared
  deps (e.g. `zod`) — they resolve from the consumer's `node_modules`. Add real
  runtime deps to the package's `dependencies`.
- **Multiple public entry points?** Add more files to `entry` (e.g.
  `['index.ts', 'src/http.ts']`) and a matching subpath to `exports`. The
  single-entry default is enough for most packages.
- `tsconfig.json` is only for `pnpm type:check` and the editor — the build is
  tsdown, not `tsc`.

## Building

| Command | Builds |
|---|---|
| `pnpm build` | all `packages/*` (topo order) **+ frontend** — host-safe (backend excluded, it builds in Docker) |
| `pnpm build:p` | `packages/*` only |
| `pnpm build:all` | everything via `pnpm -r build`, incl. backend (needs Docker artifacts owned by host — see below) |
| `pnpm --filter @fox-sphere/<name> build` | one package |

`pnpm -r` / `pnpm --filter "./packages/*"` build in **dependency order**, so a
package is built before any app that depends on it.

## Consuming from an app

```jsonc
// apps/<app>/package.json
"dependencies": {
  "@fox-sphere/<name>": "workspace:*"
}
```

```ts
import { Something } from '@fox-sphere/<name>'
```

Run `pnpm install` after adding the dependency so pnpm links the workspace
package. Build the package (`pnpm build:p`) before the app's type-check/build
needs its `dist/`.

### Do I need to touch the app's tsconfig?

**No.** Adding `"@fox-sphere/<name>": "workspace:*"` to the app's `package.json`
and running `pnpm install` is enough. Both apps use `moduleResolution: "Bundler"`
(backend `tsconfig.json`; frontend via `@vue/tsconfig`), which reads the
package's `exports` / `types` fields and resolves through the pnpm `node_modules`
symlink to `dist/index.d.ts`. No `paths` entry and no project `references` are
required.

Only requirements for a new package to work in an app:

1. `"@fox-sphere/<name>": "workspace:*"` in the app's `package.json`
2. `pnpm install` (links the workspace symlink)
3. the package is **built** (`dist/` exists) before the app type-checks —
   `pnpm build` does packages first, in dependency order

You'd only edit tsconfig if you wanted to import the package's **TS source
directly** (skip the build via `paths`/`references`). This repo doesn't —
packages ship a built `dist/` and apps consume the built types.

## Docker & file ownership (important)

The backend runs in Docker and bind-mounts `./packages` and `./apps/backend`.
The container runs as the non-root **`node` user (uid 1000)** so artifacts it
writes back to the host — `packages/*/dist`, `apps/backend/src/generated` — are
owned by the host developer (uid 1000), not root. This is what keeps host-side
`pnpm build` from failing with:

```
EACCES: permission denied, unlink '.../src/generated/prisma/client.ts'
```

If you still hit root-owned files (left over from before this was fixed, or from
another tool running as root), reclaim them once **as root**, then build
normally as yourself:

```bash
sudo rm -rf apps/backend/src/generated packages/*/dist
pnpm build                     # host: packages + frontend
docker compose build backend   # regenerates Prisma client as `node`
```

(Or `sudo chown -R "$USER:$USER" apps/backend/src/generated packages/*/dist`
instead of removing.)

See the comments in `Dockerfile` (base stage) and `docker-compose.yml` (backend
service) for the rationale.
