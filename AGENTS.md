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
| `pnpm dev:api` | Admin-panel backend for `apps/api`, `tsx watch src/server.ts` on `:3001`. Not in the dev compose stack, so this is how you run it in dev. `:api` is the explicit suffix because `:a` is taken by admin (`dev:a`). |
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
| `pnpm --filter bot-runtime backfill:channels` | One-shot script that copies the legacy `User` / `UserLottery` balances into `Viewer` / `ChannelUser` for one channel (login as a positional argument, default `TWITCH_CHANNEL_NAME`). **Insert-only by default**: it creates the `ChannelUser` rows that are absent and never updates an existing one. `--sync` is the opt-in converging mode - it upserts over all 14 copied fields, and it is the one manual run that belongs before Release B. Safe to run on every deploy - see `apps/bot-runtime/scripts/backfill-channels.ts`. In `deploy.yml` it runs under the step's `set -e` with no `|| true`, and **after** `migrate:deploy`, so a DB blip, a partial environment, a `P2002` on `Channel` (a row with the same `twitchId` already exists under a different login - `twitchId` is `@unique`) or an unknown flag all abort the deploy **before** `compose up -d`. That is a stopped deploy, not an outage: the old container is still running and still serving chat, and nothing is lost. |
| `pnpm test` | `vitest run` in every member that has tests - `apps/admin`, `apps/overlay`, `apps/bot-runtime`, `packages/backend-shared` |
| `pnpm new:pkg` | Scaffold a workspace package - see `docs/adding-a-package.md` |
| `ssh -L 5174:localhost:5174 <vm>` | Open the **deployed** admin panel at `http://localhost:5174`. The only way in - see below. |
| `.github/workflows/deploy-admin.yml` | Release the **deployed** admin panel: builds `admin-api` + `admin-web`, pushes them to GHCR, then SSHes to the VM and runs `pull` then `up -d --wait` against `docker-compose.admin.yml`. **Manual dispatch only** - the Actions tab button, with no `push.tags` trigger where `deploy.yml` has one; the bot is released by cutting a `v*` tag, the panel by hand. No migrations and no backfill: `apps/api` runs neither, and the schema it reads is migrated by the bot's release. |

`pnpm start:b` is broken - see Gotchas.

`docker compose up` runs Postgres 18 and the `bot-runtime` HTTP backend (`:3000`) with the
source bind-mounted — the Twitch backend's server app (health on `/health`, Socket.io).
The Twitch worker (bot) and both admin apps — the backend `apps/api` on `:3001`
and the `admin` frontend on `:5174` — are **not** in the dev stack; run each
locally so their logs land in the terminal:

```bash
pnpm worker:t        # the Twitch worker (chat bot + EventSub)
pnpm dev:api         # the admin-panel backend on :3001
pnpm dev:a           # the admin frontend on :5174
```

Production runs the panel differently, as its own compose project. On the VM,
`docker-compose.admin.yml` is placed beside the bot's `compose.yaml` and starts the two built
images as project `foxsphere-admin`; it publishes exactly one host port, `127.0.0.1:5174`, and
`admin-api` publishes none. The tunnel above is therefore the only way to open the panel -
nothing off the VM reaches it, and `:3001` is not on the host at all. The two stacks share
`~/foxsphere/.env` and the bot's Postgres, and nothing else.

The panel reaches the VM by `.github/workflows/deploy-admin.yml` alone: a **manual dispatch**, not
a tag, because nothing in chat reports a panel version the way the overlay reports the bot's. One
run at a time, and never canceled mid-`up`.

## First run

```bash
cp .env.example .env
docker compose up -d postgres      # or point DATABASE_URL at a Postgres you already run
pnpm install
pnpm build:p
pnpm prisma:g
```

Then edit `.env`. Three groups of values in the copied template are **not**
usable as they ship:

- **`DATABASE_URL`** is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public` - a
  placeholder, not a default. It is non-empty, so `getEnv` does **not** throw on it; you get
  an opaque Prisma connection failure against a host literally named `HOST` instead. For the
  compose Postgres above, use
  `postgresql://fox_user:fox_password@localhost:5432/foxsphere_db?schema=public`.
- **The Twitch client id/secret and the four token values** are placeholders. `TWITCH_USER_ID`,
  `TWITCH_CHANNEL_NAME` and `TWITCH_BOT_ID` ship with real values for `luckyfoxcode`.
- **`ADMIN_SESSION_SECRET`** ships as a non-empty placeholder, and it is the HMAC key for the admin
  session cookie - generate your own with `openssl rand -hex 32`. **Leaving the variable empty is
  the fail-closed case:** every route behind `requireSession` then 500s with a message naming the
  missing variable, because `config` reads it with `process.env` rather than `getEnv` and the guard
  tests it for truthiness. The shipped placeholder does **not** trip that check - it passes, and
  hands out sessions keyed by a string published in git, which is what to fix before exposing
  anything.
  `ADMIN_OAUTH_REDIRECT_URI` ships with the dev value `http://localhost:5174/api/auth/twitch/callback`
  and must be changed to a redirect URL registered in the Twitch console byte for byte, including
  scheme and port; the **Vite** port `5174`, not the API port, because `/api` is proxied and the
  browser only ever sees the proxy. That same URL is what production uses, reached through the
  tunnel rather than through Vite. `ADMIN_TWITCH_USER_ID` is the single Twitch account allowed in.
  **All three admin variables are read with `process.env`, not `getEnv`, and that is deliberate:**
  only `apps/api` acts on them - `bot-runtime` never reads them while importing the same
  `config` module, so a `getEnv` would stop the deployed bot from booting over a panel secret it
  never uses. An unset allowlist fails closed at the consumer instead - `identity.userId !== undefined`
  refuses every login - which is what an allowlist wants, and costs the panel rather than the stream.
  This was learned the hard way:
  `v1.15.0` shipped `ADMIN_TWITCH_USER_ID` on `getEnv`, and the deploy's `backfill:channels` step
  died on the missing variable under `set -e`, after both images were built and pushed and before
  `docker compose up -d`. Prod kept serving chat on the old container - a stopped deploy, not an
  outage - but the release did not ship until the VM's `.env` gained the line.
  (In `.env.prod.example` all three ship as placeholders - two are the literal `CHANGE_ME`, and
  `ADMIN_SESSION_SECRET` ships as `CHANGE_ME_openssl_rand_hex_32`. The admin stack reads the VM's
  single `~/foxsphere/.env`, the same file the bot reads - see `docker-compose.admin.yml`.)

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
| `apps/api` | Express 5 | Admin-panel backend - **deployed**, as `admin-api` in the `foxsphere-admin` compose project. HTTP only on `:3001` inside its container: the feature modules, the OpenAPI spec, and no realtime surface at all - sockets and the worker bridge belong to `bot-runtime`. **Publishes no host port**; Caddy reaches it by service name on the shared network. Swagger at `/docs`, behind the session guard |
| `apps/bot-runtime` | Express 5 (runtime), Prisma 7 + `@prisma/adapter-pg`, Twurple | Twitch backend - the deployed bot. Owns its own HTTP + Socket.io (`src/app.ts`, health on `/health`) and the worker (chat bot + EventSub) in one package. `server.ts` listens on `:3000`; in production `prod.ts` starts the HTTP listener and the worker in one process |
| `apps/admin` | Vue 3.5, Vite 8, Tailwind 4 | Admin-panel frontend, dev on `:5174`. **Deployed** as `admin-web`, the Caddy container in the same `foxsphere-admin` project - the only container with a host port, `127.0.0.1:5174` |
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
- **production - one process for the bot.** `apps/bot-runtime/src/prod.ts` starts its own HTTP listener and then boots the worker in the same process, so the worker's `forwardEventToBackend()` POST reaches a listener in its own process. The HTTP hop is redundant there but kept so dev and production share one code path - the `globalEventBus` lives inside `worker.ts` and is never shared with `app.ts`. `apps/api` and `apps/admin` are deployed, but as a second process pair in their own project: `admin-api` is a plain HTTP listener and `admin-web` is static files behind Caddy, so the bot's process shape is not involved.

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

- **Do not add columns to `User`.** Phase 1 splits it into `Channel` / `Viewer` / `ChannelUser`. Release A has landed that split additively: `Viewer` and `ChannelUser` exist and `Channel` already existed, but the only **writer** of the new tables today is the backfill script - no **bot** code reads or writes them, because every `apps/bot-runtime` path still goes to `User`. `apps/api` is the one reader: its `channel-user` module serves the viewer list, leaderboard and viewer detail from `ChannelUser`, **read-only**. The new tables stay frozen - to writes outside the backfill - until Release B moves the bot.
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
| **`pnpm start:b` is broken, for two independent reasons.** `start` is `node dist/server.js`, but `apps/bot-runtime/tsconfig.json` sets no `rootDir` and its `include` spans `src/**/*`, `scripts/**/*` and `vitest.config.ts`, so `tsc` infers the package root as the output root and `pnpm build:b` emits **`dist/src/server.js`** - the path `start` names does not exist. Widening `include` and dropping `rootDir` was a deliberate Release A change, not an accident: CI runs `tsc --noEmit` and `eslint .` over the package, and neither could see `scripts/backfill-channels.ts` without it (`vitest.config.ts` is in there for the same reason - a root-level file outside the tsconfig is a parsing error for `eslint .`, whose `parserOptions.project` is this tsconfig). **Restoring `rootDir: "./src"` (or `include: ["src/**/*"]`) also restores `dist/server.js`** - take that route rather than reshaping the emit layout. Separately, the backend is ESM (`"type": "module"`) with extensionless relative imports under `moduleResolution: "Bundler"`, which Node's ESM loader cannot resolve, so fixing only the path would still fail. Nothing reads `dist` today - production runs `start:prod` (`tsx src/prod.ts`) and the runner stage ignores `dist` - so no working path depends on the emit shape. `apps/api` has the **same** ESM defect only (its `tsconfig.json` still sets `rootDir: "./src"`, so it emits `dist/server.js`) - run it with `pnpm dev:api` instead. | `apps/bot-runtime/package.json`, `apps/bot-runtime/tsconfig.json`, `apps/api/package.json` |
| **`apps/api/openapi.json` and `apps/admin/src/api/generated/` are generated but committed.** Never hand-edit either. Never call `registry.registerPath` or `router.get/post/...` directly - `createModule`/`route()` owns both. Re-run `pnpm openapi:dump && pnpm gen:api` after any route change; a stale client fails nothing loudly. | `apps/api/src/shared/openapi/define-route.ts`, `apps/admin/orval.config.ts` |
| **The Prisma client is gitignored** (`packages/db/src/generated/`). Run `pnpm prisma:g` after a clone and after every schema edit, before anything type-checks. | `packages/db/.gitignore` |
| **`datasource db` has no `url`.** Prisma 7 reads it from `prisma.config.ts` via `env("DATABASE_URL")`. Putting `url` back in the schema is the wrong fix. | `packages/db/prisma/schema.prisma`, `packages/db/prisma.config.ts` |
| **Import PrismaClient and types from `@fox-sphere/db`.** The only `PrismaClient` in the process is built in `packages/backend-shared/src/prisma.ts`. | `packages/backend-shared/src/prisma.ts` |
| **`TwitchToken.obtainmentTimestamp` is `BigInt`.** `JSON.stringify` throws on it, so never hand a raw `TwitchToken` to `res.json()` or `io.emit()`. | `packages/db/prisma/schema.prisma` |
| **`TwitchToken` has no `@id`.** Its unique criterion is `twitchUserId` - that is the key for `findUnique` and `upsert`. | `packages/db/prisma/schema.prisma` |
| **Dev runs several processes, production runs one.** The difference is process count, not transport: `forwardEventToBackend()` POSTs to `/api/internal/events` in both, and in production that POST simply lands in the same process. | `apps/bot-runtime/src/prod.ts`, `apps/bot-runtime/src/worker.ts` |
| **`/api/internal/events` is unauthenticated** and re-emits arbitrary `event` and `data` to every connected socket. Caddy now 404s `/api/internal/*` at the edge, so it is reachable only in-process; keep that rule first in the `route` block, and never expose the port directly. It exists in `bot-runtime` only. | `apps/bot-runtime/src/app.ts`, `.docker/Caddyfile` |
| **`apps/api` routes need a Twitch session cookie, and `/docs` is behind the same guard, not above it.** Every module route sits behind `requireSession`, which verifies an HMAC-signed `fx_session` cookie against `ADMIN_SESSION_SECRET`; `GET /api/auth/me` is the module route that returns the signed-in login (from `res.locals`, not by re-reading the cookie). The session is stateless: the cookie carries `{sub, login, exp}` plus its signature and the server stores nothing, so a restart does not log anyone out and a stolen cookie cannot be revoked server-side except by rotating the secret (which logs out everyone). Three consequences. Only `config.adminTwitchUserId` - a single Twitch user id - is allowed in; a login by anyone else is refused at the callback and no cookie is issued. `ADMIN_SESSION_SECRET` and `ADMIN_OAUTH_REDIRECT_URI` are read with `process.env`, **not** `getEnv`, because only `apps/api` reads them and a `getEnv` there would stop the deployed Twitch bot from booting over secrets it never uses - an unset secret fails **closed** (500 on every admin route) rather than open. And `/docs` + `/openapi.json` are mounted *behind* the guard, deliberately: Swagger's page and its "Try it out" requests are issued by the browser, so a browser already holding `fx_session` **would** send it - cookies are host-scoped and port-agnostic - and `src/lib/session.ts` has had no `fetch` wrapper since it was reduced to `login()`/`logout()`, so there was no 401-to-login redirect to protect. **Do not copy the older claim that "Swagger cannot carry a session"**; it was wrong, and this line is here because it cost a round to unlearn. Two things make the route table worth gating anyway: `.docker/Caddyfile.admin` answers 404 for both paths before a request reaches the app, and the only published port is bound to loopback - so that edge rule is the real lock and this guard is the second one. Note the spec itself is fully public in the repo either way: `apps/api/openapi.json` is committed and orval builds the panel's client from it. | `apps/api/src/shared/middleware/require-session.ts`, `apps/api/src/shared/auth/session.ts`, `apps/api/src/app.ts`, `.docker/Caddyfile.admin` |
| **`apps/admin` reaches the OAuth login by navigation, never through a generated call, and nothing redirects on a 401.** `src/api/generated/` is orval output, committed, and CI asserts `gen:api` reproduces it byte for byte - so anything added there is overwritten on the next generation. `src/lib/session.ts` holds `login()` and `logout()` and nothing else: there is **no `fetch` wrapper**. It used to be one - `installSession()` redirected any 401 to the login route, which meant pressing Logout threw you back into a Twitch window. Login is now an explicit button. `login()` must be reached with `window.location.assign`, never through the generated client - a `fetch` follows the 302 to Twitch's HTML login page and the generated parser throws on it, which is also why the OAuth routes are absent from the spec. `useSessionQuery()` is the single source of truth for who is signed in: `GET /api/auth/me` answers 200 for the admin, 401 for nobody, 5xx for a broken backend. It maps those to `sessionState`, one of `loading`, `admin`, `guest`, `error`, and **`guest` must never be inferred from an empty login** - a dead `apps/api` also yields an empty login, and the sidebar would then offer a Login button against an API that is not there to accept it. Logout is a `POST` that answers 204; it must not redirect, and the sidebar button flips to Login only because the mutation invalidates the session query. `SameSite=Lax` withholds the cookie from a cross-site POST, which is what makes logout safe without a CSRF token. | `apps/admin/src/lib/session.ts`, `apps/admin/src/composables/useSession.ts`, `apps/admin/src/components/nav/LogoutButton.vue` |
| **CORS is inconsistent between the two backends, and neither has an allowlist.** `apps/bot-runtime` calls bare `cors()`; `apps/api` calls `cors({ origin: true, credentials: true })`, which reflects whatever `Origin` it is given rather than sending `*`. Both accept any origin, so the difference is in the headers, not in the policy - and reflecting the request's own origin is marginally **looser** than bare `cors()`: it lets a cross-origin request go out at all, where `SameSite=Lax` then withholds the session cookie from the response, so the caller gets a 401 rather than a refusal. In `bot-runtime` the origin list gates **socket** connections only (`io`'s `cors` pins `config.allowedOrigin`), so a missing origin fails the WebSocket upgrade while plain HTTP keeps working - a confusing pair to debug, and the one thing here that is actually an allowlist. Neither app guards its data with CORS: `apps/api` is guarded by `requireSession`, `bot-runtime` has no guard on `/api/internal/events` at all. | `apps/bot-runtime/src/app.ts`, `apps/api/src/app.ts` |
| **Express 5 forwards rejected promises to the error middleware automatically.** No `asyncHandler`, no `try/catch` then `next(err)`. The one `errorHandler` is shared: `packages/backend-shared/src/error-handler.ts` - it was duplicated byte-for-byte in both apps. | `apps/bot-runtime/src/app.ts`, `apps/api/src/app.ts`, `packages/backend-shared/src/error-handler.ts` |
| **`config` throws on any missing env var** through `getEnv`, and almost everything imports it transitively. Anything that loads backend code needs a complete environment. | `packages/backend-shared/src/config.ts` |
| **The backend has no path alias** - relative imports only. `@/*` exists in the frontend alone. | `apps/api/tsconfig.json`, `apps/bot-runtime/tsconfig.json`, `apps/overlay/tsconfig.app.json` |
| **Packages build before apps.** Root `build` runs `--filter "./packages/*" build` first; the backend build needs `packages/*/dist` to exist. | `package.json`, `.docker/bot-runtime.Dockerfile` |
| **The backend image runs as uid 1000 (`node`) deliberately.** Dev bind-mounts write `src/generated/` and `packages/*/dist` back to the host, and root-owned output breaks a later host-side `pnpm build`. | `.docker/bot-runtime.Dockerfile` |
| **The web image must not build `packages/db`.** Its `build` is `prisma generate`, which throws without a real `DATABASE_URL`, and the frontend never imports `@fox-sphere/db` - so the web image filters it out with `--filter "!@fox-sphere/db"`. Keep that filter when adding packages. | `.docker/web.Dockerfile` |
| **Dev `bot-runtime` and the host share `packages/db/node_modules`.** compose gives named volumes only to `bot-runtime`, `backend-shared` and `shared-schemas`; `packages/db` is a bind-mount, so a container-side pnpm (e.g. `pnpm install` inside the dev image) rewrites the host's `@prisma/client` symlink to a variant that exists only in the image's store, and host-side `pnpm worker:t` fails with `ERR_MODULE_NOT_FOUND: Cannot find package '@prisma/client'`. **After any lockfile change, run `docker compose build bot-runtime`** so container and host resolve `@prisma/client` to the same peer variant (`_d53f706f` with `magicast`, currently), then `docker compose up -d bot-runtime`. | `docker-compose.yml`, `apps/bot-runtime/src/worker.ts` |
| **The hero catalog is `heroes.json`, not a TS array**, so `satisfies` no longer type-checks it - `apps/overlay/src/utils/hero/__tests__/heroes.test.ts` is what validates every entry (shape, frame grid, files on disk). An id missing from the JSON does not error: `getHeroById` silently falls back to `DEFAULT_HERO_ID`, so a typo looks like "the sprite changed". Add heroes to the JSON, run `pnpm build:p`. | `packages/types/src/hero/heroes.json`, `packages/types/src/hero/heroes.ts` |
| **A `heroId` edited in the database crosses three caches before the overlay shows it**, and each was a way to see a stale sprite: `UserService.heroCache` (TTL `COOLDOWNS.HERO_CACHE_TTL`, plus `invalidateHero` for purchases), `useHeroOverlay`'s per-viewer `ActiveHero` (`heroId` is refreshed on repeat messages, but the entry survives `HERO_TTL`), and the lane's `v-for` key being `userId`, which never remounts - so `ActiveHero` watches `heroId` and re-spawns. Changing a hero and seeing the old one is expected until all three are addressed; `apps/overlay/src/components/hero/components/__tests__/ActiveHero.test.ts` is what holds the last one. | `apps/bot-runtime/src/modules/user/user.service.ts`, `apps/overlay/src/composables/useHeroOverlay.ts`, `apps/overlay/src/components/hero/components/ActiveHero.vue` |
| **The admin's viewers screen is a snapshot that used to refresh on every deploy, and no deploy refreshes it any more.** The bot still reads and writes `User`, so every chat xp award, spin and lottery result lands in the legacy tables while the admin renders `ChannelUser`. The two agreed at the moment of the last deploy that still ran the converging backfill; since the script became insert-only they only drift further apart, because a deploy inserts absent rows and never reconciles the existing ones. **So the screen is frozen, not merely stale** - it will not catch up on its own, however often you deploy, and the fix is a manual `backfill:channels --sync` while `User` is still authoritative. This is expected, not a bug - it is properly fixed only when Release B moves the bot onto the channel-scoped tables. | `apps/admin/src/views/ChannelUsersView.vue`, `apps/bot-runtime/src/modules/user/user.service.ts` |
| **`deploy.yml` runs `backfill:channels` on every deploy, and the default mode can no longer eat live balances - the destructive path now lives behind a flag a human has to type.** The script reads `User` / `UserLottery`, builds the rows, and writes only the ones whose `(channelId, viewerId)` is absent, so an existing `ChannelUser` row is never handed to a write at all: no `update: balance`, no upsert, nothing to reach. `--sync` keeps the old converging `upsert` for the one case that wants it, and throws when `sum(coins) ChannelUser` drops across the run - a signal *after* the write, not a guard against it. **So the deploy step can stay across the cutover** - but it does not stay forever: the script reads `User` and `UserLottery` in `reportCounts` and in the copy, so the step must be deleted in the same migration and commit that drops those two tables, not earlier and not later - and until it is, that deploy aborts under `set -e` with no `|| true`, and so does every deploy after it. Once Release B moves the bot onto `ChannelUser`, `User` freezes, every row the script builds already exists, and a deploy-time run inserts none of them: no balance is touched, so where the balances are concerned it is a structural no-op rather than a decision. It is not a total no-op - `Viewer.username` is still refreshed from `User` and a `Channel` is still created when none matches the login, both by design, and both until the legacy tables are dropped. The one manual `--sync` belongs *before* that commit, while `User` is still authoritative - after it, `--sync` is the dangerous direction. | `.github/workflows/deploy.yml`, `apps/bot-runtime/scripts/backfill-channels.ts` |
| **The four history tables are keyed by `channelId` + `channelUserId`, not `userId`, as of `20261013182939_channel_user_history` - and `User` is frozen from that migration onward.** That migration is the first one to write `ChannelUser` rows from anywhere but `backfill:channels`: it upserts `Viewer` by `twitchId` and inserts `ChannelUser` by `(channelId, viewerId)` (never updates) for every `User` that has history rows but no target yet, copying `buildChannelUserRows`' 11 balance fields plus the 3 lottery fields, then remaps the four history tables by `twitchId` - never by id, since `User.id` and `ChannelUser.id` are unrelated sequences. It has to do this itself because `deploy.yml` runs it at line 106, `backfill:channels` at line 112, and that step is insert-only: refusing to remap a viewer who has chatted since the last deploy would deadlock the release against a step that cannot yet run. What it still refuses is ambiguity: not exactly one `Channel` row aborts the deploy, because guessing would file a viewer's history under the wrong channel. **`User` and `UserLottery` are read by that migration and written by nothing in it** - frozen, to be dropped in their own migration at the end of phase 1. | `packages/db/prisma/migrations/20261013182939_channel_user_history/migration.sql`, `packages/db/prisma/schema.prisma` |
| **`20261007124645_add_channel_user/migration.sql` is additive against every pre-existing table - but it is not free of `ALTER`.** It contains two `CREATE TABLE` (`Viewer`, `ChannelUser`), four `CREATE INDEX`, and **two `ALTER TABLE "ChannelUser" ADD CONSTRAINT ... FOREIGN KEY`**. Both `ALTER`s target the table created earlier in the same file; **`Channel` receives no DDL at all**, and there is no `DROP` / `DELETE`. Prisma's Postgres connector always emits foreign keys as separate `ALTER TABLE` statements - there is no schema shape or flag that produces an inline `REFERENCES` inside `CREATE TABLE`, so a spec or plan claiming "zero `ALTER` and the FK inside `CREATE TABLE`" is describing SQL Prisma cannot generate. | `packages/db/prisma/migrations/20261007124645_add_channel_user/migration.sql`, `packages/db/prisma/schema.prisma` |
| **The test suite is small and deliberate.** Vitest in `apps/admin` (`App.vue` status branches, `views/`), `apps/overlay` (pure functions + `RouletteSpin` status smoke test), `packages/backend-shared` (pure functions) and `apps/bot-runtime` (the test-database harness) only. `pnpm test` runs all of it; CI runs it on every PR. Exactly one spec touches a real database - `apps/bot-runtime`'s `reset-db.spec.ts`, against the local `foxsphere_test` - and it covers the harness itself, not the bot: there is still **no** integration test of any feature, so "tests pass" means those units, nothing more. | `apps/admin/src/__tests__/`, `apps/admin/src/views/__tests__/`, `apps/overlay/src/{constants,utils,components}/**/__tests__/`, `packages/backend-shared/src/__tests__/`, `apps/bot-runtime/src/__tests__/helpers/` |
| **A backend test that opens a connection must go through `testDb()` / `resetDb()`, and `.env.test` is what makes that possible.** The harness is `apps/bot-runtime/src/__tests__/helpers/test-db.ts`; `assertTestDatabase` refuses any URL whose database name does not end in `_test`, and it is the *first statement* of both helpers, so it fires before the catalog read and long before the first `TRUNCATE`. Check it with `DATABASE_URL="postgresql://…/foxsphere_db?schema=public" ./node_modules/.bin/vitest run src/__tests__/helpers` - it exits 1 with `Refusing to run against "foxsphere_db"`, and nothing is truncated. `apps/bot-runtime/vitest.config.ts` loads the gitignored root `.env.test` into `test.env`, which lands in `process.env` before the first test module is imported - the only window in which `config.ts` reads anything, and the only reason the root `.env`'s `foxsphere_db` cannot win. A variable already set in the shell beats the file (dotenv semantics), which is what makes that deliberate override work. CI has no `.env.test` and no `.env`, so the `gate` job carries a **Postgres service** (`foxsphere_test`) and a `prisma migrate deploy` step, and its `env:` block must keep naming a `_test` database - a `ci`-named one fails the guard, not the test. Three traps live in that file and in `.agents/rules/testing.md`: Vitest 4 does not exclude `dist` by default while `tsc` compiles the specs there, the specs share one database so `fileParallelism` is off, and `resetDb()` never truncates `_prisma_migrations`. A fourth rides on the same code: **`resetDb(url = config.databaseUrl)` takes a URL so `assertTestDatabase` itself is testable, and it gates the helper rather than redirecting it** (the client is the shared singleton) - which is also why `beforeEach(resetDb)` throws "Invalid URL": vitest calls a hook with an argument, and that argument lands in `url`. Write `beforeEach(async () => { await resetDb(); })`. | `apps/bot-runtime/src/__tests__/helpers/test-db.ts`, `apps/bot-runtime/vitest.config.ts`, `.github/workflows/ci.yml`, `.agents/rules/testing.md` |

## Verification

`.github/workflows/ci.yml` runs this gate on every PR and on pushes to `main`/`dev` (plus a build of all four deployed images - `bot-runtime` and `web` from `deploy.yml`, `admin-api` and `admin-web` from `deploy-admin.yml`, which is manual-dispatch and not tag-triggered). The suite covers units only - never extend "tests pass" to mean the bot, the database or the socket path work. The admin coverage step enforces the 90% threshold from `apps/admin/vitest.config.ts` over the admin's business-logic files. Locally the gate is:

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
cd apps/admin     && ./node_modules/.bin/vitest run --coverage           # admin coverage >= 90%
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
| Test database and its reset helper | `apps/bot-runtime/src/__tests__/helpers/test-db.ts` - `foxsphere_test` only, `assertTestDatabase` refuses anything else; `.env.test` (repo root, gitignored) is what makes the run importable. Details in `.agents/rules/testing.md` |

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
- `pnpm test` is the only basis for saying "tests pass", and it covers units only - one spec touches the local `foxsphere_test`, and it covers the harness, not the bot. No Twitch, no sockets, no feature-level integration. Never imply more.
- If a change invalidates a documented gotcha, update this file in the same commit.
