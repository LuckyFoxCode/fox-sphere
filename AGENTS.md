# fox-sphere

> Twitch bot and live OBS overlay for the `luckyfoxcode` channel. One git repo, one pnpm workspace.
> Universal entry doc - read by any AI agent (Claude Code, opencode, Codex, Gemini CLI, Copilot CLI).
> `CLAUDE.md` is a symlink to this file. Edit this file; never edit through the symlink.

## Commands

Run from the repo root. Most scripts are `pnpm --filter` wrappers whose suffix names the
target: `:a` admin, `:b` bot-runtime, `:f` overlay, `:p` packages. `prisma:*` and `worker:*`
use a topic prefix instead, with the suffix abbreviating the action (`generate`, `migrate`,
`studio`, `twitch`) since the prefix already implies the backend. `build`, `build:all` and
`new:pkg` are scoped by neither.

| Command | Does |
|---|---|
| `pnpm build:p` | Build `packages/*` with tsdown. **Run before anything type-checks.** |
| `pnpm build` | `build:p`, then the frontend (overlay) Vite build |
| `pnpm build:all` | `pnpm -r build` - every workspace member |
| `pnpm dev:b` | `apps/bot-runtime` Twitch worker (chat bot + EventSub), `tsx watch src/worker.ts` - an alias of `worker:t` kept for tooling that calls the `dev` script |
| `pnpm dev:api` | Admin-panel backend for `apps/api`, `tsx watch src/server.ts` on `:3001`. `apps/api` is local-only (not in compose), so this is now the normal way to run it. `:api` is the explicit suffix because `:a` is taken by admin (`dev:a`). |
| `pnpm worker:t` | Twitch worker (chat bot + EventSub) - the normal way to run the bot locally in dev, so its logs land in the terminal. |
| `pnpm dev:server:b` | `apps/bot-runtime` HTTP + Socket.io backend (`tsx watch src/server.ts`) on `:3000` - the bot's own server app, run in `docker compose` (normal) or here to run it out-of-container. |
| `pnpm dev:a` | Vite dev server for the `admin` frontend on `:5174`, proxying `/api` to `:3001`. |
| `pnpm dev:f` | Vite dev server for the overlay on `:5173` |
| `pnpm openapi:dump` | Regenerate `apps/api/openapi.json` from the routes. **Run after every route change**, in the same commit. |
| `pnpm gen:api` | Regenerate the admin's typed vue-query client from that file (orval). |
| `pnpm build:f` / `pnpm preview:f` | Frontend (overlay) production build / preview |
| `pnpm lint:b` | eslint over `apps/bot-runtime` only. `apps/api` and `apps/admin` are linted by CI through `working-directory`, or locally with `pnpm --filter api lint` / `pnpm --filter admin lint` |
| `pnpm lint:f` | `run-s lint:*` - oxlint then eslint, both with `--fix` |
| `pnpm format:f` | Prettier over `apps/overlay/src` |
| `pnpm prisma:g` | `prisma generate` - **required after clone and after every schema edit** |
| `pnpm prisma:m` | `prisma migrate dev` - local |
| `pnpm --filter @fox-sphere/db prisma:migrate:deploy` | `prisma migrate deploy` - production migration step; applies only, generates no artifacts; run by CI, not by hand |
| `pnpm prisma:s` | Prisma Studio |
| `pnpm test` | `vitest run` in every member that has tests - `apps/admin`, `apps/overlay`, `packages/backend-shared` |
| `pnpm new:pkg` | Scaffold a workspace package - see `docs/adding-a-package.md` |

`pnpm start:b` is broken - see Gotchas.

`docker compose up` runs Postgres 18 and the `bot-runtime` HTTP backend (`:3000`) with the
source bind-mounted — the Twitch backend's server app (health on `/health`, Socket.io).
The Twitch worker (bot) and both local-only apps — the admin backend `apps/api` on `:3001`
(swagger on `/docs/`) and the `admin` frontend on `:5174` — are **not** in compose; run each
locally so their logs land in the terminal:

```bash
pnpm worker:t        # the Twitch worker (chat bot + EventSub)
pnpm dev:api         # the admin-panel backend on :3001
pnpm dev:a           # the admin frontend on :5174
```

## First run

```bash
cp .env.example .env
docker compose up -d postgres      # or point DATABASE_URL at a Postgres you already run
pnpm install
pnpm build:p
pnpm prisma:g
```

Then edit `.env`. Two groups of values in the copied template are **not**
usable as they ship:

- **`DATABASE_URL`** is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public` - a
  placeholder, not a default. It is non-empty, so `getEnv` does **not** throw on it; you get
  an opaque Prisma connection failure against a host literally named `HOST` instead. For the
  compose Postgres above, use
  `postgresql://fox_user:fox_password@localhost:5432/foxsphere_db?schema=public`.
- **The Twitch client id/secret and the four token values** are placeholders. `TWITCH_USER_ID`,
  `TWITCH_CHANNEL_NAME` and `TWITCH_BOT_ID` ship with real values for `luckyfoxcode`.

`PORT`, `NODE_ENV`, `DEBUG`, `COMMAND_PREFIX` and `ALLOWED_ORIGIN` ship with working values
and need no edit.

```bash
pnpm prisma:m                      # apply migrations, once DATABASE_URL above is real
```

`.env` at the repo root is gitignored, so it does not exist on a fresh clone, and `config` throws
on the first genuinely missing variable. Note that `docker compose up` (the full stack) reads
the same file but overrides `DATABASE_URL` to reach the `postgres` service by name - that
override applies only inside compose, never to a native `pnpm dev:b`.

## Architecture

| Member | Stack | Role |
|---|---|---|
| `apps/api` | Express 5 | Admin-panel backend - **local-only**, not deployed. HTTP only on `:3001` (swagger `/docs`): the feature modules, the OpenAPI spec, and no realtime surface at all - sockets and the worker bridge belong to `bot-runtime` |
| `apps/bot-runtime` | Express 5 (runtime), Prisma 7 + `@prisma/adapter-pg`, Twurple | Twitch backend - the deployed bot. Owns its own HTTP + Socket.io (`src/app.ts`, health on `/health`) and the worker (chat bot + EventSub) in one package. `server.ts` listens on `:3000`; in production `prod.ts` starts the HTTP listener and the worker in one process |
| `apps/admin` | Vue 3.5, Vite 8, Tailwind 4 | Admin-panel frontend, dev on `:5174`. Not deployed |
| `apps/overlay` | Vue 3.5, Vite 8, Tailwind 4 | OBS browser-source overlay |
| `packages/types` | tsdown | Socket event and domain contracts |
| `packages/shared-schemas` | tsdown, zod | Request and response DTOs |
| `packages/backend-shared` | tsdown | Prisma client, `config`, `AppError`s, the Express `errorHandler`, logger, xp, stream-state/constants - shared by `api` and `bot-runtime` |
| `packages/db` | Prisma 7 | The schema, the migrations and the generated client (`src/generated/`, gitignored) |

The backend is a modular monolith split by app. In `apps/api`, `src/modules/<feature>/` holds
that feature's `<feature>.routes.ts` (the `createModule`/`route()` declarations), its service
and a barrel; `src/modules/index.ts` is the single list `app.ts` mounts and `dump-openapi.ts`
reads. Cross-app backend code lives in
`packages/backend-shared` (`config/`, `prisma.ts`, `errors/`, `logger`, `xp`,
`stream-state`/`stream-constants`). Dependencies point one way - entrypoint to module
service to shared.

**Dev and production run different process shapes:**

- **dev - several processes.** `apps/bot-runtime/src/server.ts` serves the Twitch backend's HTTP and Socket.io on `:3000` (runs in `docker compose`); `apps/bot-runtime/src/worker.ts` runs the chat bot and EventSub (run locally with `pnpm worker:t`); `apps/api/src/server.ts` runs the admin backend on `:3001` (locally, `pnpm dev:api`); the `admin` frontend runs on `:5174` (`pnpm dev:a`) and the overlay on `:5173` (`pnpm dev:f`).
- **production - one process for the bot.** `apps/bot-runtime/src/prod.ts` starts its own HTTP listener and then boots the worker in the same process, so the worker's `forwardEventToBackend()` POST reaches a listener in its own process. The HTTP hop is redundant there but kept so dev and production share one code path - the `globalEventBus` lives inside `worker.ts` and is never shared with `app.ts`. `apps/api` and `apps/admin` are not deployed.

The event path is the same in both:

```
Twitch EventSub / IRC -> worker -> globalEventBus -> forwardEventToBackend()
                                                       | HTTP POST /api/internal/events
                                                       v
                                              apps/bot-runtime/src/app.ts  io.emit(...)
                                                       | WebSocket
                                                       v
                                                    overlay in OBS
```

**The admin API surface is generated, end to end.** A route is declared once with
`createModule` / `route()` in `apps/api/src/modules/<feature>/` - that single object both
mounts the Express handler (with Zod validation) and registers the OpenAPI path. 
`pnpm openapi:dump` writes the spec to the **committed** `apps/api/openapi.json`, and
`pnpm gen:api` turns that file into `apps/admin/src/api/generated/` (orval, vue-query,
one folder per tag). Nothing in that chain needs a running server. Details and the
per-verb recipes: `.agents/rules/openapi-routes.md`.

## Target architecture

Two design documents are authoritative for structural change. **Read the relevant one
before moving files, splitting services, or changing the schema's shape.** Structure is
not to be designed ad hoc here.

| Document | Covers | Status |
|---|---|---|
| [`apps/bot-runtime/docs/possible-architecture.md`](apps/bot-runtime/docs/possible-architecture.md) | Backend internals - layering, module boundaries, error handling, DI, the worker split. Five decisions resolved 2026-05-23. | Partly implemented on `main` |
| [`apps/bot-runtime/docs/multi-tenant-architecture.md`](apps/bot-runtime/docs/multi-tenant-architecture.md) | Platform target - one channel grows to 50-500. Tenant schema, service split, Redis, webhooks, six build phases. Ten decisions resolved 2026-08-05. | Not implemented |

Where the two disagree the multi-tenant document wins; it says so explicitly about the
older document's "Redis is v2, maybe" stance.

Two consequences for code written today:

- **Do not add columns to `User`.** Phase 1 splits it into `Channel` / `Viewer` / `ChannelUser`.
- **Do not add a new global `io.emit`.** Phase 1 replaces broadcast with per-channel rooms.

## Conventions

- **Backend** - double quotes, two-space indent, semicolons. There is no Prettier config here; match the surrounding file. Relative imports only, **no path alias**, and **no file extensions** - `moduleResolution` is `"Bundler"`.
- **Frontend** - Prettier with single quotes, semicolons, `printWidth` 100, `trailingComma: "all"`, `singleAttributePerLine: true`, and `prettier-plugin-tailwindcss` ordering class lists. Alias `@/*` maps to `./src/*`; always use it.
- `const` arrow functions, not `function` declarations. Never `any`.
- Every module folder carries a barrel `index.ts`. Import from the barrel, not a deep path.
- Vue SFCs are `<script setup lang="ts">` first, then `<template>`.

## Gotchas

| Gotcha | Where |
|---|---|
| **`pnpm start:b` is broken.** `start` is `node dist/server.js`, but the backend is ESM (`"type": "module"`) with extensionless relative imports under `moduleResolution: "Bundler"`, which Node's ESM loader cannot resolve. Production runs `start:prod` (`tsx src/prod.ts`) instead. `apps/api` has the **same** defect - its `start` is also `node dist/server.js`, so run it with `pnpm dev:api` instead. | `apps/bot-runtime/package.json`, `apps/bot-runtime/tsconfig.json`, `apps/api/package.json` |
| **`apps/api/openapi.json` and `apps/admin/src/api/generated/` are generated but committed.** Never hand-edit either. Never call `registry.registerPath` or `router.get/post/...` directly - `createModule`/`route()` owns both. Re-run `pnpm openapi:dump && pnpm gen:api` after any route change; a stale client fails nothing loudly. | `apps/api/src/shared/openapi/define-route.ts`, `apps/admin/orval.config.ts` |
| **The Prisma client is gitignored** (`packages/db/src/generated/`). Run `pnpm prisma:g` after a clone and after every schema edit, before anything type-checks. | `packages/db/.gitignore` |
| **`datasource db` has no `url`.** Prisma 7 reads it from `prisma.config.ts` via `env("DATABASE_URL")`. Putting `url` back in the schema is the wrong fix. | `packages/db/prisma/schema.prisma`, `packages/db/prisma.config.ts` |
| **Import PrismaClient and types from `@fox-sphere/db`.** The only `PrismaClient` in the process is built in `packages/backend-shared/src/prisma.ts`. | `packages/backend-shared/src/prisma.ts` |
| **`TwitchToken.obtainmentTimestamp` is `BigInt`.** `JSON.stringify` throws on it, so never hand a raw `TwitchToken` to `res.json()` or `io.emit()`. | `packages/db/prisma/schema.prisma` |
| **`TwitchToken` has no `@id`.** Its unique criterion is `twitchUserId` - that is the key for `findUnique` and `upsert`. | `packages/db/prisma/schema.prisma` |
| **Dev runs several processes, production runs one.** The difference is process count, not transport: `forwardEventToBackend()` POSTs to `/api/internal/events` in both, and in production that POST simply lands in the same process. | `apps/bot-runtime/src/prod.ts`, `apps/bot-runtime/src/worker.ts` |
| **`/api/internal/events` is unauthenticated** and re-emits arbitrary `event` and `data` to every connected socket. Caddy now 404s `/api/internal/*` at the edge, so it is reachable only in-process; keep that rule first in the `route` block, and never expose the port directly. It exists in `bot-runtime` only. | `apps/bot-runtime/src/app.ts`, `.docker/Caddyfile` |
| **CORS is inconsistent.** `bot-runtime`'s Socket.io pins `config.allowedOrigin` while `app.use(cors())` is wide open in both backends. The origin list gates socket connections only, so a missing origin fails the WebSocket upgrade while plain HTTP keeps working - a confusing pair to debug. | `apps/bot-runtime/src/app.ts`, `apps/api/src/app.ts` |
| **Express 5 forwards rejected promises to the error middleware automatically.** No `asyncHandler`, no `try/catch` then `next(err)`. The one `errorHandler` is shared: `packages/backend-shared/src/error-handler.ts` - it was duplicated byte-for-byte in both apps. | `apps/bot-runtime/src/app.ts`, `apps/api/src/app.ts`, `packages/backend-shared/src/error-handler.ts` |
| **`config` throws on any missing env var** through `getEnv`, and almost everything imports it transitively. Anything that loads backend code needs a complete environment. | `packages/backend-shared/src/config.ts` |
| **The backend has no path alias** - relative imports only. `@/*` exists in the frontend alone. | `apps/api/tsconfig.json`, `apps/bot-runtime/tsconfig.json`, `apps/overlay/tsconfig.app.json` |
| **Packages build before apps.** Root `build` runs `--filter "./packages/*" build` first; the backend build needs `packages/*/dist` to exist. | `package.json`, `.docker/bot-runtime.Dockerfile` |
| **The backend image runs as uid 1000 (`node`) deliberately.** Dev bind-mounts write `src/generated/` and `packages/*/dist` back to the host, and root-owned output breaks a later host-side `pnpm build`. | `.docker/bot-runtime.Dockerfile` |
| **The web image must not build `packages/db`.** Its `build` is `prisma generate`, which throws without a real `DATABASE_URL`, and the frontend never imports `@fox-sphere/db` - so the web image filters it out with `--filter "!@fox-sphere/db"`. Keep that filter when adding packages. | `.docker/web.Dockerfile` |
| **The test suite is small and deliberate.** Vitest in `apps/admin`, `apps/overlay` and `packages/backend-shared` only - pure functions plus `App.vue`'s status branches. `pnpm test` runs all of it; CI runs it on every PR. There is still **no** integration or database test, so "tests pass" means those units, nothing more. | `apps/admin/src/__tests__/`, `apps/overlay/src/utils/twitch/__tests__/`, `packages/backend-shared/src/__tests__/` |

## Verification

`.github/workflows/ci.yml` runs this gate on every PR and on pushes to `main`/`dev` (plus a build of both deployed images). The suite covers units only - never extend "tests pass" to mean the bot, the database or the socket path work. Locally the gate is:

```bash
pnpm install
pnpm --filter @fox-sphere/db prisma:generate
pnpm build:p
pnpm openapi:dump && git diff --exit-code apps/api/openapi.json          # spec matches routes
pnpm gen:api      && git diff --exit-code apps/admin/src/api/generated   # client matches spec
cd apps/api       && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .
cd ../bot-runtime && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .
cd ../overlay     && ./node_modules/.bin/vue-tsc --build && ./node_modules/.bin/oxlint . && ./node_modules/.bin/eslint .
cd ../admin       && ./node_modules/.bin/vue-tsc --build && ./node_modules/.bin/oxlint . && ./node_modules/.bin/eslint .
cd ../.. && pnpm build && pnpm test
```

Run the raw binaries. A shell wrapper that filters tool output can report a clean run that
CI then fails.

## Where things live

| Concern | Location |
|---|---|
| Entry doc | this file; `CLAUDE.md` is a symlink to it |
| Per-developer notes | `AGENTS.local.md` (gitignored) |
| Agent rules | `.agents/rules/` - table below |
| Skills | `.agents/skills/`; `.claude/skills` symlinks to it. Includes vendored third-party skills (`vue-best-practices`, `prisma-client-api`, `prisma-cli`, `prisma-upgrade-v7`, and the mattpocock architecture cluster `improve-codebase-architecture` / `codebase-design` / `domain-modeling` / `grilling` - Mermaid-based architecture reviews, falls back to code names until a `CONTEXT.md` glossary exists), each with a `_VERSION` file - see `.agents/README.md` |
| Subagent personas | `.agents/agents/` (none yet) |
| Agent config layout | `.agents/README.md` |
| Design specs and implementation plans | local-only scratch under `docs/superpowers/` (gitignored) - not committed in this repo, so it does not exist on a fresh clone |
| Architecture proposals | `apps/bot-runtime/docs/` |
| Adding a workspace package | `docs/adding-a-package.md` |

| Rule | Applies to |
|---|---|
| `.agents/rules/agent-workflow.md` | everything |
| `.agents/rules/typescript.md` | `**/*.ts`, `**/*.vue` |
| `.agents/rules/prisma.md` | `packages/db/prisma/**`, `packages/db/prisma.config.ts`, `apps/bot-runtime/src/**/*.ts`, `apps/api/src/modules/**/*.ts`, `packages/backend-shared/src/**/*.ts` |
| `.agents/rules/express.md` | `apps/api/src/{app,server}.ts`, `apps/api/src/shared/middleware/**`, `apps/bot-runtime/src/{app,server,prod}.ts`, `apps/bot-runtime/src/shared/middleware/**`, `packages/backend-shared/src/{config,errors}.ts` |
| `.agents/rules/openapi-routes.md` | `apps/api/src/modules/**`, `apps/api/src/shared/openapi/**`, `apps/api/src/dump-openapi.ts`, `packages/shared-schemas/**`, `apps/admin/orval.config.ts` |
| `.agents/rules/vue.md` | `apps/overlay/src/**`, `apps/overlay/*.config.ts`, `apps/overlay/.prettierrc.json`. `apps/admin` is a second Vue app with its **own** prettier/oxlint configs - the rule's conventions apply, the exact config values do not |
| `.agents/rules/realtime.md` | `apps/bot-runtime/src/app.ts`, `apps/bot-runtime/src/shared/services/**`, `apps/overlay/src/{composables/sockets,services}/**`, `packages/types/**` |
| `.agents/rules/monorepo.md` | `package.json`, `pnpm-workspace.yaml`, `packages/**`, `apps/*/package.json`, `.docker/**` |
| `.agents/rules/testing.md` | `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**`, `**/vitest.config.*` |

opencode auto-loads these through `.opencode/opencode.json`. Claude Code does not - read
the rule matching the files you are about to touch.

## CRITICAL - DO NOT BREAK

- Run `git commit` and `git push` ONLY when the user explicitly asks. Not to "save" work, not after finishing a task. Leave changes staged or unstaged for the user.
- NEVER add a `Co-Authored-By: Claude` trailer, or any AI co-author line, to a commit message.
- Never use `--no-verify`.
- Never edit `packages/db/src/generated/` - `prisma generate` owns it and it is gitignored.
- Never hand-edit `pnpm-lock.yaml`.
- Never commit a `.env`. `.env.example` at the repo root is the local-development template; `.env.prod.example` is the production one - they are different files for different jobs.
- `/api/internal/events` is unauthenticated and fans out to every socket. Do not expose it publicly, and do not add a second route under that prefix without stating its trust model.
- `pnpm test` is the only basis for saying "tests pass", and it covers units only - no database, no Twitch, no sockets. Never imply more.
- If a change invalidates a documented gotcha, update this file in the same commit.
