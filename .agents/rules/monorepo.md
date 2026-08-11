---
name: monorepo
description: pnpm workspace conventions - internal dependencies, the build order both apps depend on, root script naming, and what a new workspace member has to touch.
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "packages/**"
  - "apps/*/package.json"
  - ".docker/**"
---

# pnpm workspace

Four members: `apps/backend`, `apps/frontend`, `packages/types`, `packages/shared-schemas`.
pnpm 11, pinned by `packageManager` in the root `package.json`.

## Internal dependencies

Always `workspace:*`:

```json
"@fox-sphere/types": "workspace:*"
```

Never a version range, never a `file:` link. Never hand-edit `pnpm-lock.yaml` - change
`package.json` and run `pnpm install`.

## Build order is load-bearing

`packages/*` build with tsdown into `dist`, and both apps import that `dist`, not the
source. So:

```bash
pnpm build:p     # packages first, always
pnpm build       # build:p, then the frontend Vite build
```

A type error naming a symbol you just added to `packages/types` almost always means
`build:p` has not run since you added it.

`pnpm build:all` (`pnpm -r build`) builds every member including the backend.

## Root script naming

Root scripts are `pnpm --filter` wrappers with a suffix:

| Suffix | Target |
|---|---|
| `:b` | `apps/backend` |
| `:f` | `apps/frontend` |
| `:p` | `packages/*` |

Follow the pattern for new scripts, and add a row to the Commands table in `AGENTS.md`
when you add one.

## Adding a package

```bash
pnpm new:pkg
```

runs `scripts/create-package.mjs`. The full walkthrough - naming, tsdown config, wiring it
into a consumer - is `docs/adding-a-package.md`. Read it instead of copying a sibling
package by hand.

## Docker knows the member list

`.docker/backend.Dockerfile` copies the root manifests plus one `package.json` per member
**the backend build needs** - `apps/backend`, `packages/types`, `packages/shared-schemas` -
before `pnpm install --frozen-lockfile`. `apps/frontend` is deliberately absent; the backend
image never builds it. **A new member that the backend depends on therefore needs a new
`COPY` line there**, or the Docker build silently installs without it.

The image runs as the `node` user (uid 1000) deliberately: dev bind-mounts write
`apps/backend/src/generated/` and `packages/*/dist` back to the host, and root-owned output
makes a later host-side `pnpm build` fail with `EACCES`. Do not add `USER root` to make a
build step easier.
