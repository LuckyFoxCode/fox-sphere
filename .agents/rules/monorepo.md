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

Workspace members: `apps/api`, `apps/admin`, `apps/bot-runtime`, `apps/overlay`,
`packages/types`, `packages/shared-schemas`, `packages/backend-shared`, `packages/db`. pnpm 11, pinned by `packageManager` in the
root `package.json`.

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

Ten of the seventeen root scripts are `pnpm --filter` wrappers whose suffix names the
target:

| Suffix | Target |
|---|---|
| `:b` | `apps/bot-runtime` |
| `:f` | `apps/overlay` |
| `:p` | `packages/*` |

The rest do not follow it, and are not anomalies. `prisma:g`, `prisma:m` and `prisma:s` wrap
`--filter @fox-sphere/db` (the package that owns the schema), `worker:t` wraps
`--filter bot-runtime`, and `openapi:dump` / `gen:api` wrap `--filter api` and
`--filter admin`; each suffix abbreviates the *action* because the topic prefix already
implies the target. `build`, `build:all` and `new:pkg` are scoped by neither.

For a new script, use the target suffix for a plain per-app command and a topic prefix for
a family. Either way, add a row to the Commands table in `AGENTS.md`.

## Adding a package

```bash
pnpm new:pkg
```

runs `scripts/create-package.mjs`. The full walkthrough - naming, tsdown config, wiring it
into a consumer - is `docs/adding-a-package.md`. Read it instead of copying a sibling
package by hand.

## Docker knows the member list

`.docker/bot-runtime.Dockerfile` copies the root manifests plus one `package.json` per member
**the backend build needs** - `apps/bot-runtime`, `packages/types`, `packages/shared-schemas`,
`packages/backend-shared`, `packages/db` - before `pnpm install --frozen-lockfile`; its runner
stage copies only `apps/bot-runtime` plus `packages/`.

`.docker/admin.Dockerfile` does the same for the admin backend, and its list is **`apps/api`
plus all four `packages/*`** - `apps/api` depends on `backend-shared` and `shared-schemas`,
`backend-shared` depends on `db` and `types`, and nothing else has an internal dependency. It
does **not** build `apps/api`: the runner starts `tsx src/server.ts` from source, so there is
no `dist` for it.

`.docker/web.Dockerfile` builds `packages/*` **minus `@fox-sphere/db`**
(`--filter "!@fox-sphere/db"`): the frontend never imports it, and its `build` is
`prisma generate`, which throws without a real `DATABASE_URL` that this image must never
need. Keep the filter when adding packages.

`.docker/admin-web.Dockerfile` builds `apps/admin` and serves it from `caddy:2-alpine`: the
Vite `dist` is copied to `/srv` and `.docker/Caddyfile.admin` serves it, proxying `/api/*` to
the backend. Its manifest list is **`apps/admin` alone** - no `packages/*` line at all - because
`apps/admin` is the one workspace member with no `@fox-sphere/*` dependency. So there is no
`./packages/*` build step, and therefore nothing for a `--filter "!@fox-sphere/db"` to exclude
here. It still needs the whole repo as its context, because `pnpm --filter admin build` runs
orval against the committed `apps/api/openapi.json`.

**Excluding a member from an image is that Dockerfile's per-member `COPY` list, not
`.dockerignore`.** The two are easy to confuse because they used to agree: `.dockerignore`
listed `apps/admin` and `apps/api` under "local-only apps - never part of any deployed image",
so both were absent from *every* build context. Both lines are gone. What replaced that label
is not "each has its own image" - it is that *local-only* never described a `.dockerignore`
rule at all; it described these `COPY` lists, which say which image bundles what. Three facts
follow, all read off the lists above: `apps/api` is in the admin backend image's context and
out of the bot's; `apps/admin` is in no backend image, because it is not a backend and none
bundles it; and the admin panel appears in *both* frontend contexts. A `.dockerignore` rule is
shared by all four builds, so one placed there removes the member from images it belongs in -
which is exactly how `apps/api` became unbuildable here, and would have broken
`.docker/admin-web.Dockerfile` twice over: it copies `apps/admin`'s source **and** reads
`apps/api/openapi.json`.

**A new member that a backend depends on therefore needs a new `COPY` line in that backend's
Dockerfile**, or the Docker build silently installs without it. The failure is not at the
`COPY`: pnpm resolves the graph it was given, and the error surfaces later as an unresolvable
`workspace:*` specifier.

The images run as the `node` user (uid 1000) deliberately: dev bind-mounts write
`packages/db/src/generated/` and `packages/*/dist` back to the host, and root-owned output
makes a later host-side `pnpm build` fail with `EACCES`. Do not add `USER root` to make a
build step easier.
