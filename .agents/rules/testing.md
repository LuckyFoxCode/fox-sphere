---
name: testing
description: What the small vitest suite covers and what it does not, the conventions every new test follows, and the database harness that is still missing.
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
  - "**/vitest.config.*"
---

# Testing

## What exists

Vitest, in three members only:

| Where | File | Covers |
|---|---|---|
| `packages/backend-shared` | `src/__tests__/xp.spec.ts` | `getXpThresholdForLevel`, `resolveActiveXpBoost` |
| `apps/overlay` | `src/utils/twitch/__tests__/parseTwitchEmotes.test.ts` | emote positions (code points, not UTF-16), urls, malformed emote maps |
| `apps/admin` | `src/__tests__/App.test.ts` | every documented status branch, including the 500 that used to render nothing |

`pnpm test` runs all of it (`pnpm -r test`); CI runs it in the gate. Everything is a pure
function or a mounted component with the generated client stubbed - **no database, no
Twitch, no sockets**. So:

- "Tests pass" means those units and nothing else. Never let it stand for the bot working.
- The gate is still build + lint + type-check + these tests, in that order.
- Do not add a test file to a member that has no `test` script - bring the wiring with it,
  or the file rots unrun. That is what happened to the `create-vue` scaffold test this
  suite replaced.

## Conventions in force

- **Vitest**, never Jest - `vi.fn()`, `vi.mock()`, `vi.spyOn()`.
- **A `__tests__/` folder beside the code under test**, never a mirrored tree - `src/utils/twitch/__tests__/parseTwitchEmotes.test.ts` sits next to `parseTwitchEmotes.ts`.
- Backend tests as `*.spec.ts`, frontend tests as `*.test.ts`.
- Both Vue apps split their tsconfigs: `tsconfig.app.json` excludes `src/**/__tests__/*` so a build stays clean, and `tsconfig.vitest.json` type-checks the tests. `vue-tsc --build` runs both, so a broken test still fails the gate.
- Mock a composable's return with **real refs** (`ref(value)`), never `{ value }` - a
  template only unwraps refs, so a plain object reads as truthy and every branch misfires.
- Prefer a test that fails when the fix is reverted. If deleting the code under test leaves
  it green, it is testing the framework.

## When the harness lands

`apps/bot-runtime/docs/multi-tenant-architecture.md` makes the database harness phase 1,
step 1. It does not exist yet. Build it to these conventions:

- A `foxsphere_test` database inside the existing Postgres container. Not a mock layer and not SQLite; the schema is Postgres-specific.
- A `resetDb()` helper that truncates between tests, so test ordering never matters.


### The trap that will bite first

`packages/backend-shared/src/config.ts` builds `config` through `getEnv`, which **throws
on any missing variable**, and nearly every backend module imports `config` transitively.
Importing one service into one test therefore pulls in the entire environment requirement.

`.env.test` must define **every** key `getEnv()` reads. Today that is `COMMAND_PREFIX`,
`DATABASE_URL`, `ALLOWED_ORIGIN` (which has a default), and nine `TWITCH_*` values:
`TWITCH_USER_ID`, `TWITCH_BOT_ID`, `TWITCH_CLIENT_ID`, `TWITCH_CHANNEL_NAME`,
`TWITCH_CLIENT_SECRET`, `TWITCH_STREAMER_ACCESS_TOKEN`, `TWITCH_STREAMER_REFRESH_TOKEN`,
`TWITCH_BOT_ACCESS_TOKEN`, `TWITCH_BOT_REFRESH_TOKEN`.

Read the current list from the file before writing `.env.test`:

```bash
grep -o 'getEnv("[A-Z_]*"' packages/backend-shared/src/config.ts | sort -u
```

### The one test the plan requires

An integration test asserting **channel A's overlay never receives channel B's event**.
That is the property multi-tenancy exists to guarantee, and the one regression that stays
invisible until a streamer sees someone else's alert on their own stream.
