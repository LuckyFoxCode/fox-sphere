---
name: upgrade-deps
description: Upgrade fox-sphere's dependencies deliberately - risk-bucketed, each major isolated behind a real verification gate, one commit per green bucket. Use when the user says "upgrade deps", "bump packages", "update dependencies", "pnpm outdated", "bump everything to latest", or asks whether a specific package can be upgraded and what would break. Read MEMORY.md before touching anything.
---

# upgrade-deps

Upgrading is about sequencing and verification, not the bumps. The failure modes are a
major that ripples breaking changes across both apps, a "latest" that is not the version
anyone expected, and a green local run that CI rejects.

**Read [MEMORY.md](MEMORY.md) first.** It holds the traps this repo has already produced.

## Golden rule - gate with raw binaries

A shell wrapper that filters tool output can report a clean `tsc` or `eslint` on a commit
CI then fails. Every gate runs the binary directly:

```bash
pnpm install
pnpm --filter backend exec prisma generate
pnpm build:p
cd apps/backend  && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .
cd ../frontend   && ./node_modules/.bin/vue-tsc --build && ./node_modules/.bin/oxlint . && ./node_modules/.bin/eslint .
cd ../.. && pnpm build
docker compose build backend      # only when a runtime dependency moved
```

A **full gate** is every line above passing. `pnpm lint:b` and `pnpm lint:f` do not count -
both wrap the binaries through `pnpm --filter` rather than invoking them directly, and
`lint:f` additionally passes `--fix` to both `oxlint` and `eslint`, which mutates the tree
mid-gate.

## Workflow

### 1. Pre-flight

```bash
git status --short          # the user owns git; never commit unasked
git switch -c chore/dep-upgrade
pnpm outdated -r
```

Never work on `main`.

### 2. Establish facts before planning

```bash
npm view <pkg> dist-tags
```

This repo rides several leading edges - TypeScript `~6.0`, Vite 8, Tailwind 4, eslint 10,
Prisma 7 - so `latest` is frequently a **major**, and a version someone assumed exists
often does not. Correct any stated assumption with what the registry actually says before
writing a plan.

### 3. Bucket by risk

- **A - safe batch.** Every patch and minor within the same major. One `pnpm up`, one gate, one commit.
- **B - each major alone.** One bump per bucket, a full gate each. A red bucket rolls back by itself.
- **C - coupled clusters last**, so a late rollback touches nothing earlier.

The clusters in this repo:

| Cluster | Move together because |
|---|---|
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | the CLI, the runtime and the driver adapter share a generated-client contract |
| `vue`, `vue-tsc`, `@vitejs/plugin-vue` | `vue-tsc` tracks the compiler version; a mismatch produces type errors in untouched SFCs |
| `eslint`, `@vue/eslint-config-typescript`, `oxlint`, `eslint-plugin-oxlint` | frontend-only; flat-config and rule-name changes cascade across all four via `pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json')` in `apps/frontend/eslint.config.ts`. `typescript-eslint` is a separate, backend-only pairing with `eslint` - it is not part of this cluster |
| `typescript` with everything | a TS major moves every type-check at once - do it in its own bucket, first among the majors |

### 4. Research majors in parallel, apply sequentially

`package.json` and `pnpm-lock.yaml` are shared state with exactly one writer at a time.

- **Research in parallel.** One read-only agent per risky major. Give it the package, the version jump, where it is used in this tree, and the stack around it. Ask for a SAFE / RISKY / DEFER verdict first, then breaking changes and migration steps. They must not edit.
- **Apply sequentially.** One bucket at a time, gate between, because every `pnpm add` or `pnpm up` rewrites the lockfile.

### 5. Roll back per bucket

```bash
git checkout -- package.json pnpm-lock.yaml
pnpm install
```

Record why the bucket failed, then continue with the next one. A single red major does not
abandon the run.

### 6. Finish

- One commit per green bucket, **and only when the user asks for a commit**.
- No `Co-Authored-By` trailer.
- If a runtime dependency moved, rebuild the backend image - the running container holds
  the image's dependencies, so `docker compose exec` will not see a host upgrade.

### 7. Record what you learned

A new trap goes in [MEMORY.md](MEMORY.md), in the same change.
