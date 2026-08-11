# fox-sphere

> Twitch bot and live OBS overlay for the `luckyfoxcode` channel. One git repo, one pnpm workspace.
> Universal entry doc - read by any AI agent (Claude Code, opencode, Codex, Gemini CLI, Copilot CLI).
> `CLAUDE.md` is a symlink to this file. Edit this file; never edit through the symlink.

## Commands

Run from the repo root. Most scripts are `pnpm --filter` wrappers whose suffix names the
target: `:b` backend, `:f` frontend, `:p` packages. `prisma:*` and `worker:*` use a topic
prefix instead, with the suffix abbreviating the action (`generate`, `migrate`, `studio`,
`twitch`) since the prefix already implies the backend. `build`, `build:all` and `new:pkg`
are scoped by neither.

| Command | Does |
|---|---|
| `pnpm build:p` | Build `packages/*` with tsdown. **Run before anything type-checks.** |
| `pnpm build` | `build:p`, then the frontend Vite build |
| `pnpm build:all` | `pnpm -r build` - every workspace member |
| `pnpm dev:b` | Backend HTTP + Socket.io server, `tsx watch`, inspector on 9229 |
| `pnpm worker:t` | Twitch worker (chat bot + EventSub) - a separate process in dev |
| `pnpm dev:f` | Vite dev server for the overlay |
| `pnpm build:f` / `pnpm preview:f` | Frontend production build / preview |
| `pnpm lint:b` | eslint over the backend |
| `pnpm lint:f` | `run-s lint:*` - oxlint then eslint, both with `--fix` |
| `pnpm format:f` | Prettier over `apps/frontend/src` |
| `pnpm prisma:g` | `prisma generate` - **required after clone and after every schema edit** |
| `pnpm prisma:m` | `prisma migrate dev` - local |
| `pnpm --filter backend migrate:deploy` | `prisma migrate deploy` - production migration step; applies only, generates no artifacts; run by CI, not by hand |
| `pnpm prisma:s` | Prisma Studio |
| `pnpm new:pkg` | Scaffold a workspace package - see `docs/adding-a-package.md` |

`pnpm start:b` is broken - see Gotchas.

`docker compose up` runs Postgres 18 plus the backend `dev` stage with the source
bind-mounted.

## First run

```bash
cp apps/backend/.env.example apps/backend/.env
docker compose up -d postgres      # or point DATABASE_URL at a Postgres you already run
pnpm install
pnpm build:p
pnpm prisma:g
```

Then edit `apps/backend/.env`. Two groups of values in the copied template are **not**
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

`apps/backend/.env` is gitignored, so it does not exist on a fresh clone, and `config` throws
on the first genuinely missing variable. Note that `docker compose up` (the full stack) reads
the same file but overrides `DATABASE_URL` to reach the `postgres` service by name - that
override applies only inside compose, never to a native `pnpm dev:b`.

## Architecture

| Member | Stack | Role |
|---|---|---|
| `apps/backend` | Express 5, Socket.io, Prisma 7 + `@prisma/adapter-pg`, Twurple | HTTP API and Twitch worker |
| `apps/frontend` | Vue 3.5, Vite 8, Tailwind 4 | OBS browser-source overlay |
| `packages/types` | tsdown | Socket event and domain contracts |
| `packages/shared-schemas` | tsdown, zod | Request and response DTOs |

The backend is a modular monolith. `src/modules/<feature>/` holds that feature's service,
constants, helpers and barrel; `src/shared/` holds `config/`, `lib/` (Prisma), `errors/`,
`middleware/`, `services/`, `infra/` and `utils/`. Dependencies point one way - entrypoint
to module service to `shared/`.

**Dev and production run different process shapes:**

- **dev - two processes.** `apps/backend/src/server.ts` serves HTTP and Socket.io; `apps/backend/src/worker.ts` runs the chat bot and EventSub.
- **production - one process.** `apps/backend/src/prod.ts` starts the HTTP listener first, then boots the worker in the same process so both share the in-memory `globalEventBus`.

The event path is the same in both:

```
Twitch EventSub / IRC -> worker -> globalEventBus -> forwardEventToBackend()
                                                       | HTTP POST /api/internal/events
                                                       v
                                                    app.ts  io.emit(...)
                                                       | WebSocket
                                                       v
                                                    overlay in OBS
```

## Target architecture

Two design documents are authoritative for structural change. **Read the relevant one
before moving files, splitting services, or changing the schema's shape.** Structure is
not to be designed ad hoc here.

| Document | Covers | Status |
|---|---|---|
| [`apps/backend/docs/possible-architecture.md`](apps/backend/docs/possible-architecture.md) | Backend internals - layering, module boundaries, error handling, DI, the worker split. Five decisions resolved 2026-05-23. | Partly implemented on `main` |
| [`apps/backend/docs/multi-tenant-architecture.md`](apps/backend/docs/multi-tenant-architecture.md) | Platform target - one channel grows to 50-500. Tenant schema, service split, Redis, webhooks, six build phases. Ten decisions resolved 2026-08-05. | Not implemented |

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
| **`pnpm start:b` is broken.** `start` is `node dist/server.js`, but the backend is ESM (`"type": "module"`) with extensionless relative imports under `moduleResolution: "Bundler"`. Node's ESM loader needs full specifiers. Production runs `start:prod` (`tsx src/prod.ts`) instead. | `apps/backend/package.json`, `apps/backend/tsconfig.json` |
| **The Prisma client is gitignored** (`/src/generated/prisma`). Run `pnpm prisma:g` after a clone and after every schema edit, before anything type-checks. | `apps/backend/.gitignore` |
| **`datasource db` has no `url`.** Prisma 7 reads it from `prisma.config.ts` via `env("DATABASE_URL")`. Putting `url` back in the schema is the wrong fix. | `apps/backend/prisma/schema.prisma`, `apps/backend/prisma.config.ts` |
| **Import the client from `generated/prisma/client`**, not `generated/prisma`. | `apps/backend/src/shared/lib/prisma.ts` |
| **`TwitchToken.obtainmentTimestamp` is `BigInt`.** `JSON.stringify` throws on it, so never hand a raw `TwitchToken` to `res.json()` or `io.emit()`. | `apps/backend/prisma/schema.prisma` |
| **`TwitchToken` has no `@id`.** Its unique criterion is `twitchUserId` - that is the key for `findUnique` and `upsert`. | `apps/backend/prisma/schema.prisma` |
| **Dev runs two processes, production runs one.** `prod.ts` shares an in-memory `globalEventBus` between server and worker; in dev they are separate and talk over HTTP. | `apps/backend/src/prod.ts`, `apps/backend/src/worker.ts` |
| **`/api/internal/events` is unauthenticated** and re-emits arbitrary `event` and `data` to every connected socket. It must never be publicly reachable. | `apps/backend/src/app.ts` |
| **CORS is inconsistent.** Socket.io pins `config.allowedOrigin`; `app.use(cors())` is wide open. | `apps/backend/src/app.ts` |
| **Express 5 forwards rejected promises to the error middleware automatically.** No `asyncHandler`, no `try/catch` then `next(err)`. | `apps/backend/src/app.ts`, `apps/backend/src/shared/middleware/error-handler.ts` |
| **`config` throws on any missing env var** through `getEnv`, and almost everything imports it transitively. Anything that loads backend code needs a complete environment. | `apps/backend/src/shared/config/index.ts` |
| **The backend has no path alias** - relative imports only. `@/*` exists in the frontend alone. | `apps/backend/tsconfig.json`, `apps/frontend/tsconfig.app.json` |
| **Packages build before apps.** Root `build` runs `--filter "./packages/*" build` first; the backend build needs `packages/*/dist` to exist. | `package.json`, `.docker/backend.Dockerfile` |
| **The backend image runs as uid 1000 (`node`) deliberately.** Dev bind-mounts write `src/generated/` and `packages/*/dist` back to the host, and root-owned output breaks a later host-side `pnpm build`. | `.docker/backend.Dockerfile` |
| **No tests exist anywhere in this repo.** | whole tree |

## Verification

**There is no test suite.** Never claim tests pass. The gate is:

```bash
pnpm install
pnpm --filter backend exec prisma generate
pnpm build:p
cd apps/backend  && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .
cd ../frontend   && ./node_modules/.bin/vue-tsc --build && ./node_modules/.bin/oxlint . && ./node_modules/.bin/eslint .
cd ../.. && pnpm build
```

Run the raw binaries. A shell wrapper that filters tool output can report a clean run that
CI then fails.

## Where things live

| Concern | Location |
|---|---|
| Entry doc | this file; `CLAUDE.md` is a symlink to it |
| Per-developer notes | `AGENTS.local.md` (gitignored) |
| Agent rules | `.agents/rules/` - table below |
| Skills | `.agents/skills/`; `.claude/skills` symlinks to it. Includes vendored third-party skills (`vue-best-practices`, `prisma-client-api`, `prisma-cli`, `prisma-upgrade-v7`), each with a `_VERSION` file - see `.agents/README.md` |
| Subagent personas | `.agents/agents/` (none yet) |
| Agent config layout | `.agents/README.md` |
| Design specs and implementation plans | local-only scratch under `docs/superpowers/` (gitignored) - not committed in this repo, so it does not exist on a fresh clone |
| Architecture proposals | `apps/backend/docs/` |
| Adding a workspace package | `docs/adding-a-package.md` |

| Rule | Applies to |
|---|---|
| `.agents/rules/agent-workflow.md` | everything |
| `.agents/rules/typescript.md` | `**/*.ts`, `**/*.vue` |
| `.agents/rules/prisma.md` | `apps/backend/prisma/**`, `apps/backend/prisma.config.ts`, `apps/backend/src/**/*.ts` |
| `.agents/rules/express.md` | `apps/backend/src/{app,server,prod}.ts`, `apps/backend/src/shared/{middleware,errors,config}/**` |
| `.agents/rules/vue.md` | `apps/frontend/src/**`, `apps/frontend/*.config.ts`, `apps/frontend/.prettierrc.json` |
| `.agents/rules/realtime.md` | `apps/backend/src/app.ts`, `apps/backend/src/shared/services/**`, `apps/frontend/src/{composables/sockets,services}/**`, `packages/types/**` |
| `.agents/rules/monorepo.md` | `package.json`, `pnpm-workspace.yaml`, `packages/**`, `apps/*/package.json`, `.docker/**` |
| `.agents/rules/testing.md` | `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**`, `**/vitest.config.*` |

opencode auto-loads these through `.opencode/opencode.json`. Claude Code does not - read
the rule matching the files you are about to touch.

## CRITICAL - DO NOT BREAK

- Run `git commit` and `git push` ONLY when the user explicitly asks. Not to "save" work, not after finishing a task. Leave changes staged or unstaged for the user.
- NEVER add a `Co-Authored-By: Claude` trailer, or any AI co-author line, to a commit message.
- Never use `--no-verify`.
- Never edit `apps/backend/src/generated/` - `prisma generate` owns it and it is gitignored.
- Never hand-edit `pnpm-lock.yaml`.
- Never commit a `.env`. `apps/backend/.env.example` is the local-development template; `.env.prod.example` at the repo root is the production one - they are different files for different jobs.
- `/api/internal/events` is unauthenticated and fans out to every socket. Do not expose it publicly, and do not add a second route under that prefix without stating its trust model.
- Do not claim "tests pass". There are none.
- If a change invalidates a documented gotcha, update this file in the same commit.
