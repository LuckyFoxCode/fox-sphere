---
name: testing
description: What the vitest suite covers and what it does not, the conventions every new test follows, and the guarded test database the backend specs run against.
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
  - "**/vitest.config.*"
---

# Testing

## What exists

Vitest, in four members only:

| Where | File | Covers |
|---|---|---|
| `packages/backend-shared` | `src/__tests__/xp.spec.ts` | `getXpThresholdForLevel`, `resolveActiveXpBoost` |
| `packages/backend-shared` | `src/__tests__/channel-backfill.spec.ts` | the pure `User` -> `Viewer` / `ChannelUser` row mapper - every copied balance and flag field, the three lottery fields, the no-lottery default, and the missing-viewer throw; plus `channelUserKey`, `selectMissingRows` (insert-only selection, including that one channel's existing rows never suppress another's), and `parseBackfillArgs` |
| `apps/bot-runtime` | `src/__tests__/helpers/test-db.spec.ts` | `assertTestDatabase` in both directions - no database needed |
| `apps/bot-runtime` | `src/__tests__/helpers/reset-db.spec.ts` | `resetDb` against the live `foxsphere_test` |
| `apps/bot-runtime` | `src/modules/channel/__tests__/channel-context.spec.ts` | `resolveChannelContext` against the live `foxsphere_test` - resolves the row `TWITCH_CHANNEL_NAME` names, does not query again once resolved, does not cache a failed lookup, throws a message naming the variable and the script, and still reports the resolved channel under `NODE_ENV=production` |
| `apps/overlay` | `src/utils/twitch/__tests__/parseTwitchEmotes.test.ts` | emote positions (code points, not UTF-16), urls, malformed emote maps |
| `apps/overlay` | `src/constants/__tests__/rouletteSegments.test.ts` | segment catalog, rarity tiers, and tape strip constants |
| `apps/overlay` | `src/utils/roulette/__tests__/tapeFill.test.ts` | tape strip fill algorithm - center winner, no adjacent duplicates, weights match backend |
| `apps/overlay` | `src/components/roulette/__tests__/RouletteSpin.test.ts` | roulette widget status smoke test (idle/spinning/jackpot takeover) |
| `apps/admin` | `src/__tests__/App.test.ts` | every documented status branch, including the 500 that used to render nothing |
| `apps/admin` | `src/views/__tests__/ChannelView.test.ts` | channel detail screen - load, edit, delete, and every status branch |
| `apps/admin` | `src/views/__tests__/ChannelUsersView.test.ts` | viewers screen - list, leaderboard and viewer detail, with the route login and page state resolved before the hook call |

`pnpm test` runs all of it (`pnpm -r test`); CI runs it in the gate. All of it is a pure
function, a mounted component with the generated client stubbed, or - in exactly one file -
a real connection to a throwaway Postgres. So:

- "Tests pass" means those units and nothing else. Never let it stand for the bot working,
  and never let the one database spec stand for "the bot writes what it should".
- The gate is still build + lint + type-check + these tests, in that order.
- Do not add a test file to a member that has no `test` script - bring the wiring with it,
  or the file rots unrun. That is what happened to the `create-vue` scaffold test this
  suite replaced.

## Conventions in force

- **Vitest**, never Jest - `vi.fn()`, `vi.mock()`, `vi.spyOn()`.
- **A `__tests__/` folder beside the code under test**, never a mirrored tree - `src/utils/twitch/__tests__/parseTwitchEmotes.test.ts` sits next to `parseTwitchEmotes.ts`.
- Backend tests as `*.spec.ts`, frontend tests as `*.test.ts`.
- Both Vue apps split their tsconfigs: `tsconfig.app.json` excludes `src/**/__tests__/*` so a build stays clean, and `tsconfig.vitest.json` type-checks the tests. `vue-tsc --build` runs both, so a broken test still fails the gate. `apps/bot-runtime` has no such split: its one tsconfig covers `src`, `scripts` and `vitest.config.ts`, so `tsc --noEmit` and `eslint .` see the tests too.
- Mock a composable's return with **real refs** (`ref(value)`), never `{ value }` - a
  template only unwraps refs, so a plain object reads as truthy and every branch misfires.
- Prefer a test that fails when the fix is reverted. If deleting the code under test leaves
  it green, it is testing the framework.

## The test database

`apps/bot-runtime/src/__tests__/helpers/test-db.ts` is the harness
`apps/bot-runtime/docs/multi-tenant-architecture.md` asks for in phase 1, step 1.

- **`foxsphere_test`**, inside the existing Postgres container - not a mock layer and not
  SQLite, because the schema is Postgres-specific. Bring it up with `prisma migrate
  deploy` and `DATABASE_URL` pointing at it; never `migrate dev`, which would also reset
  the dev database if the variable is ever wrong.
- **`resetDb()`** truncates every table in the default schema, `RESTART IDENTITY CASCADE`,
  so ordering never matters. Table names come from `pg_tables`, not from a list in the
  code, so a migration added later is covered without editing this file. It reads
  `current_schema()`, which is what `?schema=public` in the URL resolves to.
- **`testDb()`** hands out the Prisma client - behind the same guard, because `prisma` is
  exported from `@fox-sphere/backend-shared` and a test could otherwise take it directly.

### The guard is not optional, and not cosmetic

`assertTestDatabase(url)` throws unless the database name ends in `_test`, and it is the
**first statement** of both `resetDb()` and `testDb()` - before the catalog read, before
the first `TRUNCATE`. A guard that fires afterwards is worthless, because the database is
already empty by then.

To see it refuse, and to see that nothing was truncated:

```bash
cd apps/bot-runtime
DATABASE_URL="postgresql://fox_user:fox_password@localhost:5432/foxsphere_db?schema=public" \
  ./node_modules/.bin/vitest run src/__tests__/helpers   # exits 1, "Refusing to run against \"foxsphere_db\""
./node_modules/.bin/vitest run src/__tests__/helpers     # exits 0
```

The two failure modes stay distinguishable on purpose: this guard says `Refusing to run
against "<name>"`, while a missing variable in the test environment says `Environment
configuration error: Variable [X] is missing or empty in .env` and comes out of
`config.ts` at import.

**The ordering is under test, not just asserted in a comment.** `resetDb(url = config.databaseUrl)`
takes a URL so the guard itself can be pointed at `foxsphere_db` from a spec, and
`reset-db.spec.ts` asserts both that the promise rejects with the guard's message and that
neither `$queryRaw` nor `$executeRawUnsafe` was called. The spies are what make the
*ordering* the assertion: the client is the shared singleton, so a guard dropped below the
catalog read still throws the same message and still looks correct. Deleting the guard, or
moving it one line down, turns that spec red - which is the only reason it will stay there.

### `.env.test` is the test environment, and it is gitignored

`packages/backend-shared/src/config.ts` builds `config` through `getEnv`, which **throws
on any missing variable**, and nearly every backend module imports `config` transitively.
`.env.test` at the repo root therefore has to define **every** key `getEnv()` reads - today
that is `COMMAND_PREFIX`, `DATABASE_URL`, `ALLOWED_ORIGIN` and `BOT_VERSION` (both with a
default), and nine `TWITCH_*` values: `TWITCH_USER_ID`, `TWITCH_BOT_ID`,
`TWITCH_CLIENT_ID`, `TWITCH_CHANNEL_NAME`, `TWITCH_CLIENT_SECRET`,
`TWITCH_STREAMER_ACCESS_TOKEN`, `TWITCH_STREAMER_REFRESH_TOKEN`,
`TWITCH_BOT_ACCESS_TOKEN`, `TWITCH_BOT_REFRESH_TOKEN`.

Read the current list from the file before editing `.env.test`:

```bash
grep -o 'getEnv("[A-Z_]*"' packages/backend-shared/src/config.ts | sort -u
```

`apps/bot-runtime/vitest.config.ts` parses it and hands it to vitest as `test.env`, which
lands in `process.env` **before the first test module is imported** - the only window in
which `config.ts` reads anything. The root `.env` is loaded by `config.ts` itself at the
same moment and points at `foxsphere_db`, so without this the dev database would win.
Keys already present in `process.env` are left alone (dotenv semantics), which is what
makes the deliberate override above possible.

On CI there is no `.env.test` and no `.env`: the `gate` job's `env:` block supplies every
key directly, and it is a **Postgres service plus a `prisma migrate deploy` step**, not a
local file, that the one database-backed spec depends on. Its `DATABASE_URL` has to name
`foxsphere_test` like any other - a `ci`-named database fails the guard, not the test.

### Four traps worth knowing

- **Vitest 4 does not exclude `dist` by default** (`configDefaults.exclude` is
  `node_modules` and `.git` only), and `apps/bot-runtime`'s `build` is `tsc` over an
  `include` that covers `src/**/*` - tests included. Without the explicit
  `exclude: [...configDefaults.exclude, "dist/**"]`, `pnpm build:b` would leave compiled
  copies of the specs in `dist/`, and both copies would run against one database.
- **The specs share one database, so files must not run in parallel.** A second
  database-backed file at vitest's default runs concurrently with the first and empties
  its rows mid-test - reproducible, not theoretical. `fileParallelism: false` in
  `apps/bot-runtime/vitest.config.ts` serializes them; it costs nothing here because
  the pure specs take milliseconds.
- **`beforeEach(resetDb)` does not work - vitest calls a hook with an argument**, and that
  argument lands in `resetDb`'s first parameter, so `new URL(<function>)` throws "Invalid
  URL". Write `beforeEach(async () => { await resetDb(); })`. The URL parameter exists so
  `assertTestDatabase` is testable against a non-test database without a second machine,
  and it does NOT redirect the connection: the client is the shared singleton, bound to
  `config.databaseUrl` at import.
- **`resetDb()` must never truncate `_prisma_migrations`.** It is the journal of applied
  migrations, not data: emptying it leaves a fully-migrated database claiming to have no
  migrations, and the next `prisma migrate deploy` against it fails with `relation "User"
  already exists` (P3018) - which is precisely the run you need to catch the test database
  up with a new migration.

### The one test the plan requires

An integration test asserting **channel A's overlay never receives channel B's event**.
That is the property multi-tenancy exists to guarantee, and the one regression that stays
invisible until a streamer sees someone else's alert on their own stream.
