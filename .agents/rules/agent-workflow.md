---
name: agent-workflow
description: Git policy, the verification gate, and the files no agent may edit. Applies to all work in this repo.
---

# Agent workflow

## Git

- Run `git commit` and `git push` ONLY when the user explicitly asks. Not after finishing a task, not to "save" work. Leave the changes and say what you left.
- NEVER add a `Co-Authored-By: Claude` trailer, or any other AI co-author line.
- Never use `--no-verify`.
- Never force-push. Never `git reset --hard` over uncommitted work you did not create.
- Work on a branch, not `main`.

## Verification gate

**There is no test suite in this repo.** Never claim tests pass, never write "tests are green".

The full gate:

```bash
pnpm install
pnpm --filter backend exec prisma generate
pnpm build:p
cd apps/backend  && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .
cd ../frontend   && ./node_modules/.bin/vue-tsc --build && ./node_modules/.bin/oxlint . && ./node_modules/.bin/eslint .
cd ../.. && pnpm build
```

Run the raw binaries from `node_modules/.bin`. A shell wrapper that filters tool output can
report a clean run on a commit CI then rejects.

For a change confined to one app, the minimum is that app's type-check and lint - plus
`pnpm build:p` first if you touched anything under `packages/`.

## Files no agent edits

| Path | Why |
|---|---|
| `apps/backend/src/generated/` | `prisma generate` owns it; gitignored |
| `pnpm-lock.yaml` | pnpm owns it - change `package.json` and reinstall |
| `.env`, `.env.test` once populated with real secrets | Never commit one, never edit someone else's populated file. Creating `apps/backend/.env` from `apps/backend/.env.example` for local setup, and creating a fresh `.env.test` (see `testing.md`), are expected setup steps, not exceptions — `apps/backend/.env.example` is the local-development template, `.env.prod.example` at the repo root is the production one |
| `CLAUDE.md` | a symlink - edit `AGENTS.md` |

## Before structural change

Read `apps/backend/docs/possible-architecture.md` (backend internals) or
`apps/backend/docs/multi-tenant-architecture.md` (platform target) before moving files,
splitting a service, or reshaping the schema. Do not invent structure that contradicts
them.

## Keeping the docs true

If a change invalidates a gotcha documented in `AGENTS.md`, update `AGENTS.md` in the same
commit. A stale gotcha costs more than a missing one, because it is trusted.
