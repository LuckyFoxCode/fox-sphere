---
name: testing
description: There is no test suite yet - what that means for any claim of correctness today, and the conventions the phase-1 harness must be built to when it lands.
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
  - "**/vitest.config.*"
---

# Testing

## Today: there is no suite

No test runner is installed in any workspace member, and no `test` script exists.

Therefore:

- **Never say "tests pass", "tests are green", or "verified by tests".** There is nothing to run.
- The verification gate is build, lint and type-check - see `agent-workflow.md`.
- Do not add a lone test file. A test nothing runs is worse than no test: it rots quietly and implies coverage that does not exist. Bring the harness with it or leave it out.

## When the harness lands

`apps/bot-runtime/docs/multi-tenant-architecture.md` makes the harness phase 1, step 1. Build
it to these conventions:

- **Vitest**, never Jest - `vi.fn()`, `vi.mock()`, `vi.spyOn()`.
- A `foxsphere_test` database inside the existing Postgres container. Not a mock layer and not SQLite; the schema is Postgres-specific.
- A `resetDb()` helper that truncates between tests, so test ordering never matters.
- Backend tests as `*.spec.ts`, frontend tests as `*.test.ts`. `apps/overlay/tsconfig.app.json` already excludes `src/**/__tests__/*`, which fixes the frontend location.

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
